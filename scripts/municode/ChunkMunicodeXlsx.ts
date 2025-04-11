import * as XSL from "xlsx";
import _ from "lodash";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { codeChunk } from "@/src/db/schema";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { eq } from "drizzle-orm";
import { Command } from "commander";
import { PlanningSearchJurisdiction } from "@/src/constants";

const program = new Command();

program
  .name("chunk-municode-xlsx")
  .description("Process and chunk Municode XLSX files into the database")
  .requiredOption(
    "-j, --jurisdiction <jurisdiction>",
    "Jurisdiction code (e.g., kansas_city_mo)"
  )
  .requiredOption("-f, --file <filename>", "Path to the XLSX file to process")
  .parse(process.argv);

const options = program.opts();
const jurisdiction = options.jurisdiction as PlanningSearchJurisdiction;
const filename = options.file;

// absolute gigachunks here
const CHUNK_SIZE = 5000;
const OVERLAP = 1000;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: OVERLAP,
});

const main = async () => {
  const workbook = XSL.readFile(filename);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XSL.utils.sheet_to_json(sheet) as any[];

  if (
    (
      await db
        .select()
        .from(codeChunk)
        .where(eq(codeChunk.jurisdiction, jurisdiction))
        .limit(1)
    ).length > 0
  ) {
    console.log(`Database already has data for ${jurisdiction}`);
    return;
  }

  console.log(`Inserting ${json.length} rows`);

  for (const rows of _.chunk(json, 100)) {
    const values = [];
    for (const row of rows) {
      if (!row["Content"]) continue;

      const chunks = await splitter.splitText(row["Content"]);
      for (const chunk of chunks) {
        values.push({
          jurisdiction,
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
