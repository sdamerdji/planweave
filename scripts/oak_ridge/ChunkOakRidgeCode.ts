import { codeChunk, codeDocument } from "@/src/db/schema";
import { db } from "@/src/db";

import { eq, and } from "drizzle-orm";
import { embedTexts } from "@/src/EmbeddingClient";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import assert from "assert";
import _ from "lodash";

// absolute gigachunks here
const CHUNK_SIZE = 5000;
const OVERLAP = 1000;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: OVERLAP,
});

const splitCodeByArticleAndSection = (
  code: string
): {
  article: string;
  section: string;
  body: string;
}[] => {
  // Split the code by section headers (Section X.)
  const sections = [];

  // Article 14 isn't all-capsed for no reason
  const articleRegex = /^(ARTICLE [XVI]+|Article XIV <br>).*$/gm;

  const articleMatches = [...code.matchAll(articleRegex)];

  // If no articles found, return the entire code as one section
  assert(articleMatches.length > 0, "No articles found");

  // Process each article
  for (let i = 0; i < articleMatches.length; i++) {
    const currentArticleMatch = articleMatches[i];
    const currentArticleIndex = currentArticleMatch.index!;
    const nextArticleIndex =
      i < articleMatches.length - 1
        ? articleMatches[i + 1].index!
        : code.length;

    // Extract the article heading
    const articleHeading = currentArticleMatch[0].trim();

    // Extract the article content
    const articleContent = code
      .substring(currentArticleIndex + articleHeading.length, nextArticleIndex)
      .trim();

    // Regular expression to match section headers like "Section 1." or "SECTION 2."
    const sectionRegex = /^(sec\.|section) \d+\.\d+.*$/gim;

    // Find sections within this article
    const sectionMatches = [...articleContent.matchAll(sectionRegex)];

    // If no sections found in this article, add the entire article as one section
    if (sectionMatches.length === 0) {
      sections.push({
        article: articleHeading,
        section: "",
        body: articleContent,
      });
      continue;
    }

    // Process each section within the article
    for (let j = 0; j < sectionMatches.length; j++) {
      const currentSectionMatch = sectionMatches[j];
      const currentSectionIndex = currentSectionMatch.index!;
      const nextSectionIndex =
        j < sectionMatches.length - 1
          ? sectionMatches[j + 1].index!
          : articleContent.length;

      // Extract the section heading
      const sectionHeading = currentSectionMatch[0].trim();

      // Extract the section content
      const sectionContent = articleContent
        .substring(
          currentSectionIndex + sectionHeading.length,
          nextSectionIndex
        )
        .trim();

      // we misfire on stuff like a table of contents all the time; just skip these
      if (sectionContent.trim().length === 0) {
        continue;
      }

      sections.push({
        article: articleHeading,
        section: sectionHeading,
        body: sectionContent,
      });
    }
  }

  return sections;
};

const main = async () => {
  const oakRidgeCodeDocument = await db
    .select()
    .from(codeDocument)
    .where(eq(codeDocument.jurisdiction, "oak_ridge_tn"));

  assert(
    oakRidgeCodeDocument.length === 1,
    "Should only be the one document for oak ridge"
  );

  // mistral isn't getting the headings right, just take those out
  const content = oakRidgeCodeDocument[0].pdfContent.replaceAll(
    /^(# |## )/gim,
    ""
  );

  const sections = splitCodeByArticleAndSection(content);

  const chunks: {
    text: string;
    pdfTitle: string;
    headingText: string;
    bodyText: string;
  }[] = [];

  for (const section of sections) {
    const sectionChunks = await splitter.splitText(section.body);
    sectionChunks.forEach((chunk) => {
      chunks.push({
        text: `${section.article}\n\n${section.section}\n\n${chunk}`,
        pdfTitle: section.article,
        headingText: section.section,
        bodyText: chunk,
      });
    });
  }

  console.log(`Inserting ${chunks.length} total chunks`);
  for (const chunkBatch of _.chunk(chunks, 100)) {
    const embeddings = await embedTexts(chunkBatch.map((c) => c.text));
    const values = chunkBatch.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[chunk.text],
      jurisdiction: "oak_ridge_tn",
      pdfUrl: oakRidgeCodeDocument[0].pdfUrl,
    }));
    await db.insert(codeChunk).values(values);
    console.log(`Inserted ${values.length} chunks`);
  }

  console.log(`Finished ${oakRidgeCodeDocument[0].pdfTitle}`);
};

main().catch(console.error);
