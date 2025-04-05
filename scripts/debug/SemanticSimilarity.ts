import { db } from "@/src/db";
import { codeChunk } from "@/src/db/schema";
import { cosineDistance, eq } from "drizzle-orm";
import { embedTexts } from "@/src/EmbeddingClient";
import { program } from "commander";

let query: string = "";
let jurisdiction: string = "johnson_county_ks";

program
  .argument("<query>")
  .option(
    "-j, --jurisdiction <jurisdiction>",
    "Jurisdiction to search in",
    "johnson_county_ks"
  )
  .action((q, options) => {
    query = q;
    jurisdiction = options.jurisdiction;
  });

program.parse();

const searchCodeChunks = async () => {
  console.log(`Searching for code chunks similar to: "${query}"`);
  console.log(`Jurisdiction: ${jurisdiction}`);

  const queryEmbedding = Object.values(await embedTexts([query]))[0];

  const topK = await db
    .select({
      id: codeChunk.id,
      text: codeChunk.text,
      pdfTitle: codeChunk.pdfTitle,
      headingText: codeChunk.headingText,
      bodyText: codeChunk.bodyText,
      pdfUrl: codeChunk.pdfUrl,
    })
    .from(codeChunk)
    .where(eq(codeChunk.jurisdiction, jurisdiction))
    .orderBy(cosineDistance(codeChunk.embedding, queryEmbedding))
    .limit(5);

  console.log("\nTop 5 most similar code chunks:");
  console.log("--------------------------------");

  for (const result of topK) {
    console.log(`\nPDF: ${result.pdfTitle}`);
    console.log(`Heading: ${result.headingText}`);
    console.log(`URL: ${result.pdfUrl}`);
    console.log("\nContent:");
    console.log(result.bodyText);
    console.log("\n--------------------------------");
  }
};

searchCodeChunks().catch(console.error);
