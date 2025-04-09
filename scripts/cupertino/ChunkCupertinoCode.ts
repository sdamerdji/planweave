import fs from "fs/promises";
import * as cheerio from "cheerio";
import { db } from "@/src/db";
import { codeChunk } from "@/src/db/schema";
import { embedTexts } from "@/src/EmbeddingClient";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PlanningSearchJurisdiction } from "@/src/constants";

// absolute gigachunks here
const CHUNK_SIZE = 5000;
const OVERLAP = 1000;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: OVERLAP,
});

const getSectionUrl = (dataPath: string) =>
  `https://codehub.gridics.com/us/ca/cupertino#${dataPath}`;

const main = async () => {
  const html = await fs.readFile(
    "code_documents/cupertino_zoning_code.txt",
    "utf-8"
  );
  const $ = cheerio.load(html);
  const chapters = $(".view-body > .view-details > .section > .section");
  // Get all section elements that are children of the code element

  for (const chapter of chapters) {
    const chapterTitle = $(chapter).find("h3").text();
    const sections = $(chapter).children(".section");

    const values: {
      jurisdiction: PlanningSearchJurisdiction;
      pdfTitle: string;
      headingText: string;
      text: string;
      bodyText: string;
      pdfUrl: string;
    }[] = [];
    for (const section of sections) {
      const sectionTitle = $(section).find("h4").text();
      const content = $(section).find("> :not(:first-child)").text();
      const sectionUrl = getSectionUrl(section.attribs["data-path"]);

      const chunks = await splitter.splitText(content);

      values.push(
        ...chunks.map(
          (c) =>
            ({
              jurisdiction: "cupertino_ca",
              pdfTitle: chapterTitle,
              headingText: sectionTitle,
              text: c,
              bodyText: `${chapterTitle}\n\n${sectionTitle}\n\n${c}`,
              pdfUrl: sectionUrl,
            }) as const
        )
      );
    }

    const embeddings = await embedTexts(values.map((v) => v.bodyText));

    if (values.length > 0) {
      await db.insert(codeChunk).values(
        values.map((v) => ({
          ...v,
          embedding: embeddings[v.bodyText],
        }))
      );
    }
    console.log(`Inserted ${values.length} code chunks for ${chapterTitle}`);
  }
};

main().catch(console.error);
