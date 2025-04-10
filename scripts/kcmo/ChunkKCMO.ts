import * as XSL from "xlsx";
import _ from "lodash";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { codeChunk } from "@/src/db/schema";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// absolute gigachunks here
const CHUNK_SIZE = 5000;
const OVERLAP = 1000;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: OVERLAP,
});

const main = async () => {
  const workbook = XSL.readFile("code_documents/kcmo_development_code.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XSL.utils.sheet_to_json(sheet) as any[];

  console.log(`Inserting ${json.length} rows`);

  for (const rows of _.chunk(json, 100)) {
    const values = [];
    for (const row of rows) {
      if (!row["Content"]) continue;

      const chunks = await splitter.splitText(row["Content"]);
      for (const chunk of chunks) {
        values.push({
          jurisdiction: "kansas_city_mo",
          pdfUrl: row["Url"],
          pdfTitle: row["Title"],
          headingText: row["Subtitle"],
          bodyText: chunk,
          text: `${row["Title"]}\n\n${row["Subtitle"]}\n\n${chunk}`,
        } as const);
      }
    }

    const embeddings = await embedTexts(values.map((v) => v.text));

    await db.insert(codeChunk).values(
      values.map((v, i) => ({
        ...v,
        embedding: embeddings[v.text],
      }))
    );

    console.log(`Inserted ${values.length} chunks for ${rows.length} rows`);
  }
};

main().catch(console.error);
