import { Command } from "commander";
import { PlanningSearchJurisdiction } from "@/src/constants";
import * as mammoth from "mammoth";
import * as cheerio from "cheerio";
import assert from "assert";
import { Element } from "domhandler";
import _ from "lodash";
import { embedTexts } from "@/src/EmbeddingClient";
import { codeChunk } from "@/src/db/schema";
import { db } from "@/src/db";
import * as XSL from "xlsx";

const program = new Command();

program
  .name("chunk-municode-docx")
  .description("Process and chunk Municode DOCX files into the database")
  .requiredOption(
    "-j, --jurisdiction <jurisdiction>",
    "Jurisdiction code (e.g., kansas_city_mo)"
  )
  .requiredOption("-w, --word <word>", "Path to the DOCX file to process")
  .requiredOption("-x, --xlsx <xlsx>", "Path to the XLSX file to process")
  .parse(process.argv);

const options = program.opts();
const jurisdiction = options.jurisdiction as PlanningSearchJurisdiction;
const wordFilename = options.word;
const xlsxFilename = options.xlsx;

// absolute gigachunks here
const CHUNK_SIZE = 5000;

type Section = {
  chapterHeading: string;
  sectionHeading: string;
  url: string | null;
  contents: Element[];
};

type Chunk = {
  chapterHeading: string;
  sectionHeading: string;
  url: string | null;
  htmlContent: string;
  textContent: string;
  embeddableContent: string;
};

const main = async () => {
  const workbook = XSL.readFile(xlsxFilename);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XSL.utils.sheet_to_json(sheet) as any[];
  const urlByTitle = Object.fromEntries(
    json.map((r) => [r["Title"], r["Url"]])
  );

  const result = await mammoth.convertToHtml({ path: wordFilename });

  const $ = cheerio.load(result.value);

  let currentChapterHeading = null;
  let currentSection: Section | null = null;
  const sections: Section[] = [];

  const bodyChildren = $("body").children();

  for (const child of bodyChildren) {
    if (child.name === "h1" || child.name === "h3") {
      // h1s and h3s don't seem important
      continue;
    } else if (
      // ordinance references are noise
      $(child)
        .text()
        .match(/^\(Ord\./)
    ) {
      continue;
    } else if ($(child).find("img").length > 0) {
      // don't try to embed base64 image data
      continue;
    } else if (child.name === "h2") {
      currentChapterHeading = $(child).text();
    } else if (child.name === "p") {
      const childText = $(child).text();
      if (childText.match(/^[0-9]+\-[0-9]+\-[0-9]+/)) {
        if (currentSection) {
          sections.push(currentSection);
        }

        const url = urlByTitle[childText.split(/\s/)[0]];

        assert(currentChapterHeading);
        if (!url) {
          console.error(`No URL found for section: ${childText}`);
        }
        currentSection = {
          chapterHeading: currentChapterHeading,
          sectionHeading: childText,
          url,
          contents: [],
        };
      } else {
        assert(currentSection, "No current section");
        currentSection.contents.push(child);
      }
    } else if (child.name === "table" || child.name === "ol") {
      assert(currentSection, "No current section");
      currentSection.contents.push(child);
    } else {
      assert(false, "Unhandled element: " + child.name);
    }
  }

  assert(currentSection);
  sections.push(currentSection);

  // Process sections into chunks with overlap
  const chunks: Chunk[] = [];

  for (const section of sections) {
    const contentLengths = section.contents.map((c) => $(c).text().length);
    const chunkIntervals: [number, number][] = [];

    while (
      chunkIntervals.length === 0 ||
      chunkIntervals[chunkIntervals.length - 1][1] < contentLengths.length
    ) {
      const start =
        chunkIntervals.length === 0
          ? 0
          : chunkIntervals[chunkIntervals.length - 1][1];
      let end = null;
      for (let i = start; i < contentLengths.length; i++) {
        if (_.sum(contentLengths.slice(start, i)) > CHUNK_SIZE) {
          end = i - 1;
          break;
        }
      }

      if (end === null) {
        // got to the end without running out of chunk space
        chunkIntervals.push([start, contentLengths.length]);
      } else if (start === end) {
        // allow oversize chunks if only 1 element
        chunkIntervals.push([start, start + 1]);
      } else {
        chunkIntervals.push([start, end]);
      }
    }

    const overlappingIntervals = chunkIntervals.map(([start, end]) => [
      Math.max(0, start - 1),
      end,
    ]);

    for (const [start, end] of overlappingIntervals) {
      const textContent = section.contents
        .slice(start, end)
        .map((c) => $(c).text())
        .join("");
      chunks.push({
        chapterHeading: section.chapterHeading,
        sectionHeading: section.sectionHeading,
        url: section.url,
        htmlContent: section.contents
          .slice(start, end)
          .map((c) => $(c).toString())
          .join(""),
        textContent,
        embeddableContent: `${section.chapterHeading} ${section.sectionHeading} ${textContent}`,
      });
    }
  }

  console.log(
    `Created ${chunks.length} chunks from ${sections.length} sections`
  );

  // Embed and store chunks in database
  for (const chunkGroup of _.chunk(chunks, 50)) {
    console.log(`Embedding ${chunkGroup.length} chunks`);
    const embeddings = await embedTexts(
      chunkGroup.map((chunk) => chunk.embeddableContent)
    );

    await db.insert(codeChunk).values(
      chunkGroup.map((chunk) => ({
        jurisdiction,
        text: chunk.embeddableContent,
        pdfTitle: chunk.chapterHeading,
        headingText: chunk.sectionHeading,
        bodyText: chunk.textContent,
        htmlContent: chunk.htmlContent,
        pdfUrl: chunk.url,
        embedding: embeddings[chunk.embeddableContent],
      }))
    );
  }

  console.log(`Successfully stored ${chunks.length} chunks in the database`);
};

main().catch(console.error);
