import { NextResponse } from "next/server";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { codeChunk } from "@/src/db/schema";
import { cosineDistance, eq, sql, and, count } from "drizzle-orm";
import { evaluateDocumentRelevance } from "@/src/EvaluateDocumentRelevance";
import _ from "lodash";
import { OpenAIClient } from "@/src/OpenaiClient";
import { RequestBody, ResponseBody } from "./apiTypes";

const USE_CRAG = true;

const PRINT_QUERIES = true;

// Extract keywords from the query
const getKeywords = async (query: string) => {
  const systemPrompt = `
    You will be provided with a user query. We're going to do keyword search
    over a large set of documents, and we need to select a couple of the most
    important keywords to search with. Choose no more than 3.

    The keywords should ONLY be proper nouns.

    EXAMPLES:

    input: Is the budget of San Francisco larger than that of New York City?
    output: San Francisco, New York City

    input: What's the most recent hearing on 1024 Market St?
    output: 1024 Market St

    input: What's the most recent hearing on the budget?
    output: None

    input: What can I build with RLD zoning?
    output: RLD

    Separate your keywords with commas.
    `;

  const response = await OpenAIClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
  });

  const responseText = response.choices[0].message.content ?? "";
  return responseText
    .split(",")
    .map((keyword) => keyword.trim())
    .flatMap((keyword) => keyword.split(" "))
    .filter((word) => word.toLocaleLowerCase() !== "none");
};

export async function POST(request: Request) {
  try {
    const { query: searchQuery, conversationHistory } =
      (await request.json()) as RequestBody;

    const queryEmbedding = Object.values(await embedTexts([searchQuery]))[0];
    const keywords = await getKeywords(searchQuery);

    // Execute the query
    const documents = await db
      .select({
        id: codeChunk.id,
        text: codeChunk.text,
        pdfTitle: codeChunk.pdfTitle,
        headingText: codeChunk.headingText,
        bodyText: codeChunk.bodyText,
        jurisdiction: codeChunk.jurisdiction,
        pdfUrl: codeChunk.pdfUrl,
      })
      .from(codeChunk)
      .where(eq(codeChunk.jurisdiction, "johnson_county_ks"))
      .orderBy(
        // // prioritize documents that contain the keywords
        sql`to_tsquery('english', ${keywords.join(" & ")}) @@ to_tsvector('english', ${codeChunk.text}) desc`,
        // then documents that are closer to the query embedding
        cosineDistance(codeChunk.embedding, queryEmbedding)
      )
      .limit(5);

    process.stdout.write(
      JSON.stringify(
        db
          .select({
            id: codeChunk.id,
            text: codeChunk.text,
            pdfTitle: codeChunk.pdfTitle,
            headingText: codeChunk.headingText,
            bodyText: codeChunk.bodyText,
            jurisdiction: codeChunk.jurisdiction,
            pdfUrl: codeChunk.pdfUrl,
          })
          .from(codeChunk)
          .where(eq(codeChunk.jurisdiction, "johnson_county_ks"))
          .orderBy(
            // // prioritize documents that contain the keywords
            sql`to_tsquery('english', ${keywords.join(" & ")}) @@ to_tsvector('english', ${codeChunk.text}) desc`,
            // then documents that are closer to the query embedding
            cosineDistance(codeChunk.embedding, queryEmbedding)
          )
          .limit(5)
          .toSQL()
      )
    );

    if (documents.length === 0) {
      return NextResponse.json(
        {
          responseText: "No relevant code chunks found.",
          documents: [],
        },
        { status: 201 }
      );
    }

    let relevantDocuments = documents;
    if (USE_CRAG) {
      const startCragTime = Date.now();
      const relevance = await Promise.all(
        documents.map((doc) => evaluateDocumentRelevance(searchQuery, doc.text))
      );
      const cragTime = Date.now() - startCragTime;

      // Find documents deemed not relevant
      const nonRelevantDocuments = documents.filter((_, i) => !relevance[i]);

      relevantDocuments = documents.filter((_, i) => relevance[i] === true);

      if (documents.length > 0 && relevantDocuments.length === 0) {
        console.error(
          "CRITICAL: Documents found but ALL filtered out by CRAG as not relevant. Inspect raw documents."
        );
      }
    }

    // Return early if no relevant documents are found
    if (relevantDocuments.length === 0) {
      return NextResponse.json(
        {
          responseText: "No relevant code chunks found.",
          documents: [],
        },
        { status: 201 }
      );
    }

    const systemPrompt = `
      You will be provided with a USER QUERY as well as some SUPPORTING
      DOCUMENTS. Use the supporting documents to answer the user's question.

      The SUPPORTING DOCUMENTS are snippets of Johnson County, Kansas code.
      It's possible that the SUPPORTING DOCUMENTS do not contain the answer,
      and in those cases it's ok to say that you don't have enough information
      to answer the question.
      `;

    const userPrompt = `
      USER QUERY:
      ${searchQuery}

      SUPPORTING DOCUMENTS:
      ${relevantDocuments.map((doc, i) => i + ") " + doc.pdfTitle + "\n\n" + doc.text).join("\n\n")}
      `;

    const response = await OpenAIClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory
          .map((q) => [
            { role: "user", content: q.question } as const,
            { role: "assistant", content: q.answer } as const,
          ])
          .flat(),
        { role: "user", content: userPrompt },
      ],
    });

    const responseText = response.choices[0].message.content ?? "";

    return NextResponse.json(
      {
        responseText: responseText,
        documents: relevantDocuments,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Full error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete" },
      { status: 500 }
    );
  }
}
