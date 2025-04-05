import { db } from "@/src/db";
import { codeChunk } from "@/src/db/schema";
import { cosineDistance, eq } from "drizzle-orm";
import { embedTexts } from "@/src/EmbeddingClient";
import { program } from "commander";

program
  .argument("<query>")
  .option(
    "-j, --jurisdiction <jurisdiction>",
    "Jurisdiction to search in",
    "johnson_county_ks"
  )
  .option("-k, --top-k <top-k>", "Number of results to return", "5")
  .option("-v, --verbose", "Verbose output");

program.parse(process.argv);
const options = program.opts();
const query = program.args[0];

const searchCodeChunks = async () => {
  console.log(`Searching for code chunks similar to: "${query}"`);
  console.log(`Jurisdiction: ${options.jurisdiction}`);

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
    .where(eq(codeChunk.jurisdiction, options.jurisdiction))
    .orderBy(cosineDistance(codeChunk.embedding, queryEmbedding))
    .limit(parseInt(options.topK));

  console.log(`\nTop ${options.topK} most similar code chunks:`);
  console.log("--------------------------------");

  for (const result of topK) {
    if (options.verbose) {
      console.log(`\nPDF: ${result.pdfTitle}`);
      console.log(`Heading: ${result.headingText}`);
      console.log(`URL: ${result.pdfUrl}`);
      console.log("\nContent:");
      console.log(result.bodyText);
      console.log("\n--------------------------------");
    } else {
      console.log(`${result.pdfTitle} - ${result.headingText}`);
    }
  }
};

searchCodeChunks().catch(console.error);
