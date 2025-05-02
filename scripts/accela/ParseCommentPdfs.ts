import fs from "fs/promises";
import pdfParse from "pdf-parse";
import { OpenAI } from "openai";
import { env } from "@/src/env";
import { db } from "@/src/db";
import { planReviewComment } from "@/src/db/schema";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const getCommentsWithGpt = async (pdfText: string) => {
  const systemPrompt = `
You are an expert architect. Given a plan review document from the city, extract just the comments that must be addressed.

Note that "Resubmittal requirements" are boilerplate and do not contain interesting information, so they should not be included.

In your response, list each comment, one per line, and nothing else. If there are no comments, only respond with NONE
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: pdfText },
    ],
  });

  if (response.choices[0].message.content?.trim().toLowerCase() === "none") {
    return [];
  }

  const comments = response.choices[0].message.content
    ?.split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  return comments ?? [];
};

const parseCommentPdfs = async () => {
  const recordNumbers = (await fs.readdir("./accela-scrape")).filter(
    (n) => !n.startsWith(".")
  );

  for (const recordNumber of recordNumbers) {
    const files = await fs.readdir(`./accela-scrape/${recordNumber}`);
    const pdfs = files.filter((file) => file.endsWith(".pdf"));
    for (const pdf of pdfs) {
      const pdfPath = `./accela-scrape/${recordNumber}/${pdf}`;
      const parsedPdf = await pdfParse(await fs.readFile(pdfPath));
      const comments = await getCommentsWithGpt(parsedPdf.text);
      console.log(recordNumber, pdf, comments);
      if (comments.length > 0) {
        await db
          .insert(planReviewComment)
          .values(
            comments.map((comment) => ({
              jurisdiction: "denver_co",
              recordNumber: recordNumber,
              documentName: pdf,
              comment: comment,
            }))
          )
          .onConflictDoNothing();
      }
    }
  }
};

parseCommentPdfs().catch(console.error);
