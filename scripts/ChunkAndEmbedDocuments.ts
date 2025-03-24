import { db } from "@/src/db";
import { documentChunk, eventAgendaText, rawEvent } from "@/src/db/schema";
import { eq, isNull, and, sql } from "drizzle-orm";
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
    // Use a subquery to first compute the rank, then order by it in the outer query
    const unprocessedAgendas = await db
      .select({
        event_agenda_text: eventAgendaText,
        raw_event: rawEvent,
        // Calculate the rank for ordering, but we'll apply the ordering in SQL directly
        date_rank: sql<number>`rank() over (partition by ${eventAgendaText.legistarClient} order by cast(${rawEvent.json}->>'EventDate' as timestamp) desc)`
      })
      .from(eventAgendaText)
      .leftJoin(documentChunk, eq(eventAgendaText.id, documentChunk.documentId))
      .innerJoin(
        rawEvent,
        and(
          eq(eventAgendaText.legistarClient, rawEvent.legistarClient),
          eq(eventAgendaText.legistarEventId, rawEvent.legistarEventId)
        )
      )
      .where(isNull(documentChunk.documentId))
      // Apply ordering with a SQL expression instead of using the calculated rank
      .orderBy(
        sql`rank() over (partition by ${eventAgendaText.legistarClient} order by cast(${rawEvent.json}->>'EventDate' as timestamp) desc)`,
        eventAgendaText.legistarClient
      )
      .limit(DOCUMENT_BATCH_SIZE);

    console.log(`Queried ${DOCUMENT_BATCH_SIZE} documents`);

    if (unprocessedAgendas.length === 0) {
      break;
    }

    // Log date information for debugging
    console.log("Documents ordered by recency within legistar client:");
    unprocessedAgendas.forEach(agenda => {
      const eventDate = (agenda.raw_event.json as any)["EventDate"];
      console.log(`Client: ${agenda.event_agenda_text.legistarClient}, Rank: ${agenda.date_rank}, Date: ${eventDate}`);
    });

    let chunks: {
      legistarClient: string;
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
          legistarClient: agenda.event_agenda_text.legistarClient,
          index: i,
          text: c.pageContent,
          documentId: agenda.event_agenda_text.id,
          documentTable: "event_agenda_text",
        }))
      );
    }
    console.log(
      `Created ${chunks.length} chunks from ${unprocessedAgendas.length} documents (ordered by recency within legistar client)`
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
