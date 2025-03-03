import { db } from "@/src/db";
import { documentChunk, eventAgendaText } from "@/src/db/schema";
import { eq, isNull } from "drizzle-orm";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedTexts } from "@/src/EmbeddingClient";

const CHUNK_SIZE = 800;
const OVERLAP = 200;

const DOCUMENT_BATCH_SIZE = 10;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: OVERLAP,
});

const main = async () => {
  while (true) {
    const unprocessedAgendas = await db
      .select()
      .from(eventAgendaText)
      .leftJoin(documentChunk, eq(eventAgendaText.id, documentChunk.documentId))
      .where(isNull(documentChunk.documentId))
      .limit(DOCUMENT_BATCH_SIZE);

    console.log(`Queried ${DOCUMENT_BATCH_SIZE} documents`);

    if (unprocessedAgendas.length === 0) {
      break;
    }

    let chunks: {
      index: number;
      text: string;
      documentId: number;
      documentTable: string;
    }[] = [];
    for (const agenda of unprocessedAgendas) {
      const documentChunks = await splitter.createDocuments([
        agenda.event_agenda_text.text,
      ]);

      chunks = chunks.concat(
        documentChunks.map((c, i) => ({
          index: i,
          text: c.pageContent,
          documentId: agenda.event_agenda_text.id,
          documentTable: "event_agenda_text",
        }))
      );
    }
    console.log(
      `Created ${chunks.length} chunks from ${unprocessedAgendas.length} documents`
    );

    const embeddings = await embedTexts(chunks.map((c) => c.text));
    console.log(`Embedded ${chunks.length} chunks`);

    const insertValues = chunks
      .filter((c) => c.text in embeddings)
      .map((c) => ({
        ...c,
        embedding: embeddings[c.text],
      }));

    if (insertValues.length > 0) {
      await db.insert(documentChunk).values(insertValues);
    }
    console.log(`Inserted ${insertValues.length} chunks`);
  }
};

main().catch(console.error);
