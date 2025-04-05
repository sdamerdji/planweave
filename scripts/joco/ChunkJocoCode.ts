import { JocoCodePdfUrls } from "@/src/constants";
import { codeChunk, codeDocument } from "@/src/db/schema";
import { db } from "@/src/db";
import { downloadAndParsePdf } from "@/src/DownloadAndParsePdf";

import { eq, and } from "drizzle-orm";
import { embedTexts } from "@/src/EmbeddingClient";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// absolute gigachunks here
const CHUNK_SIZE = 5000;
const OVERLAP = 1000;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: OVERLAP,
});

const splitCodeBySection = (code: string) => {
  // Split the code by section headers (Section X.)
  const sections = [];

  // Regular expression to match section headers like "Section 1." or "SECTION 2."
  const sectionRegex = /\b(?:Section|SECTION)\s+\d+\.[^\n]*\n/g;

  // Find all section headers
  const matches = [...code.matchAll(sectionRegex)];

  // If no sections found, return the entire code as one section
  if (matches.length === 0) {
    return [{ heading: "", body: code }];
  }

  // Process each section
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const currentIndex = currentMatch.index!;
    const nextIndex =
      i < matches.length - 1 ? matches[i + 1].index! : code.length;

    // Extract the section heading
    const heading = currentMatch[0];

    // Extract the section body (excluding the heading)
    const headingEndIndex = currentIndex + heading.length;
    const body = code.substring(headingEndIndex, nextIndex).trim();

    // Add both heading and body to sections
    sections.push({ heading: heading.trim(), body: body.trim() });
  }

  return sections;
};

const main = async () => {
  const codeDocuments = await db
    .select()
    .from(codeDocument)
    .where(eq(codeDocument.jurisdiction, "johnson_county_ks"));

  for (const codeDocument of codeDocuments) {
    const sections = splitCodeBySection(codeDocument.pdfContent);
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
          text: `${codeDocument.pdfTitle}\n\n${section.heading}\n\n${chunk}`,
          pdfTitle: codeDocument.pdfTitle,
          headingText: section.heading,
          bodyText: chunk,
        });
      });
    }

    console.log(`${codeDocument.pdfTitle} has ${chunks.length} chunks`);

    const embeddings = await embedTexts(chunks.map((c) => c.text));
    const values = chunks.map((chunk) => ({
      text: chunk.text,
      pdfTitle: chunk.pdfTitle,
      headingText: chunk.headingText,
      bodyText: chunk.bodyText,
      embedding: embeddings[chunk.text],
      jurisdiction: "johnson_county_ks",
      pdfUrl: codeDocument.pdfUrl,
    }));

    await db.insert(codeChunk).values(values);

    console.log(`Finished ${codeDocument.pdfTitle}`);
  }
};

main().catch(console.error);
