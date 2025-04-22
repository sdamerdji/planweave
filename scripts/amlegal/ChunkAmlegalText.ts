import _ from "lodash";
import fs from "fs/promises";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { codeChunk } from "@/src/db/schema";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { eq } from "drizzle-orm";
import { Command } from "commander";
import { PlanningSearchJurisdiction } from "@/src/constants";
import * as cheerio from "cheerio";

const program = new Command();

program
  .name("chunk-amlegal-text")
  .description("Process and chunk AMLegal text files into the database")
  .requiredOption(
    "-j, --jurisdiction <jurisdiction>",
    "Jurisdiction code (e.g., kansas_city_mo)"
  )
  .requiredOption("-f, --file <filename>", "Path to the html file to process")
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

const BASE_URL_BY_JURISDICTION: Partial<
  Record<PlanningSearchJurisdiction, string>
> = {
  canyon_county_id:
    "https://codelibrary.amlegal.com/codes/canyoncountyid/latest/canyoncounty_id/",
};

// Helper function to find all matches with their positions
function findAllMatches(
  text: string,
  regex: RegExp
): { match: string; index: number }[] {
  const matches: { match: string; index: number }[] = [];
  let match;

  // Create a new RegExp from the provided one to ensure we have the 'g' flag
  const globalRegex = new RegExp(
    regex.source,
    regex.flags.includes("g") ? regex.flags : regex.flags + "g"
  );

  while ((match = globalRegex.exec(text)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
    });
  }

  return matches;
}

const main = async () => {
  if (!BASE_URL_BY_JURISDICTION[jurisdiction]) {
    throw new Error(`No base URL found for jurisdiction: ${jurisdiction}`);
  }

  // Check if data already exists for this jurisdiction
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

  // Read the text file
  const amlegalHtml = await fs.readFile(filename, "utf-8");

  // Find article positions
  // const articleMatches = findAllMatches(fileContent, ARTICLE_REGEX);
  // console.log(`Found ${articleMatches.length} articles`);

  // if (articleMatches.length === 0) {
  //   console.error("No articles found in the document");
  //   return;
  // }

  const articles: {
    title: string;
  }[] = [];

  const allSections: {
    articleTitle: string;
    sectionTitle: string;
    content: string;
    sectionUrl: string;
  }[] = [];

  const $ = cheerio.load(amlegalHtml);

  const divs = $("body > div");

  console.log(divs.length);

  // Extract articles
  for (const div of divs) {
    const articleDiv = $(div).find("div.Article");
    const title = $(articleDiv)
      .find("br")
      .replaceWith(" ")
      .end()
      .text()
      .replace("  ", " ");

    if (articleDiv.length === 1) {
      articles.push({
        title,
      });
    } else if (articleDiv.length === 0) {
      const sectionDiv = $(div).find("div.Section");
      const sectionId = sectionDiv.attr("id");
      console.log(sectionId);
      const sectionUrl = `${BASE_URL_BY_JURISDICTION[jurisdiction]}${sectionId?.split("rid-")[1]}`;

      if (sectionDiv.length === 1) {
        const sectionContent = $(div)
          .find("div.Normal-Level")
          .toArray()
          .map((e) => $(e).text())
          .join("\n");
        allSections.push({
          articleTitle: articles[articles.length - 1].title,
          sectionTitle: sectionDiv.text(),
          content: sectionContent,
          sectionUrl,
        });
      }
    }
  }

  console.log(allSections);

  // Process in batches of 10 sections
  for (const sectionBatch of _.chunk(allSections, 10)) {
    const values = [];

    for (const section of sectionBatch) {
      if (!section.content) continue;

      const chunks = await splitter.splitText(section.content);
      for (const chunk of chunks) {
        values.push({
          jurisdiction,
          pdfUrl: section.sectionUrl,
          pdfTitle: section.articleTitle,
          headingText: section.sectionTitle,
          bodyText: chunk,
          text: `AMLegal document\n\n${section.articleTitle} - ${section.sectionTitle}\n\n${chunk}`,
        } as const);
      }
    }

    const embeddings = await embedTexts(values.map((v) => v.text));

    await db.insert(codeChunk).values(
      values.map((v) => ({
        ...v,
        embedding: embeddings[v.text],
      }))
    );

    console.log(
      `Inserted ${values.length} chunks for ${sectionBatch.length} sections`
    );
  }
};

main().catch(console.error);
