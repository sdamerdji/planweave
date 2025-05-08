import { OpenAIClient } from "@/src/OpenaiClient";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { codeChunk } from "@/src/db/schema";
import { cosineDistance, eq, sql, and, count } from "drizzle-orm";
import { evaluateDocumentRelevance } from "@/src/EvaluateDocumentRelevance";
import { Document } from "@/app/api/codeSearch/apiTypes";
import {
  PlanningSearchJurisdiction,
  PlanningSearchJurisdictionNames,
} from "@/src/constants";
import { processHighlights } from "./highlightText";

const USE_CRAG = true;

const DEBUG = true;

// Debug logging utility
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args);
  }
};

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
    temperature: 0,
  });

  const responseText = response.choices[0].message.content ?? "";
  return responseText
    .split(",")
    .map((keyword) => keyword.trim())
    .flatMap((keyword) => keyword.split(" "))
    .filter((word) => word.toLocaleLowerCase() !== "none");
};

export async function processRAGQuery(
  searchQuery: string,
  conversationHistory: { question: string; answer: string }[] = [],
  jurisdiction: PlanningSearchJurisdiction
): Promise<{
  responseText: string;
  documents: Document[];
}> {
  const timings: Record<string, number> = {};
  const startTime = Date.now();

  const queryEmbedding = Object.values(await embedTexts([searchQuery]))[0];
  const keywords = await getKeywords(searchQuery);
  timings.embeddingAndKeywords = Date.now() - startTime;

  const orderBy = [cosineDistance(codeChunk.embedding, queryEmbedding)];

  if (keywords.length > 0) {
    orderBy.unshift(
      sql`to_tsquery('english', ${keywords.join(" | ")}) @@ to_tsvector('english', ${codeChunk.text}) desc`
    );
  }

  // Execute the query
  const dbStartTime = Date.now();
  const documents = await db
    .select({
      id: codeChunk.id,
      text: codeChunk.text,
      pdfTitle: codeChunk.pdfTitle,
      headingText: codeChunk.headingText,
      bodyText: sql<string>`coalesce(${codeChunk.htmlContent}, ${codeChunk.bodyText}) as body_text`,
      jurisdiction: codeChunk.jurisdiction,
      pdfUrl: codeChunk.pdfUrl,
    })
    .from(codeChunk)
    .where(eq(codeChunk.jurisdiction, jurisdiction))
    .orderBy(...orderBy)
    .limit(30);
  timings.databaseQuery = Date.now() - dbStartTime;

  if (documents.length === 0) {
    return {
      responseText: "No relevant code chunks found.",
      documents: [],
    };
  }

  let relevantDocuments = documents;
  if (USE_CRAG) {
    const startCragTime = Date.now();
    const relevance = await Promise.all(
      documents.map((doc) => evaluateDocumentRelevance(searchQuery, doc.text))
    );
    timings.cragEvaluation = Date.now() - startCragTime;
    relevantDocuments = documents.filter((_, i) => relevance[i] === true);

    if (documents.length > 0 && relevantDocuments.length === 0) {
      debugLog(
        "CRITICAL: Documents found but ALL filtered out by CRAG as not relevant. Inspect raw documents."
      );
    }
  }

  if (DEBUG) {
    for (const doc of documents) {
      debugLog(
        `[${relevantDocuments.map((d) => d.id).includes(doc.id) ? "X" : " "}] ${doc.pdfTitle} - ${doc.headingText}`
      );
    }
  }

  // Return early if no relevant documents are found
  if (relevantDocuments.length === 0) {
    return {
      responseText: "No relevant code chunks found.",
      documents: [],
    };
  }

  var topRelevantDocuments = relevantDocuments.slice(0, 5);

  // Process highlights for the documents
  const highlightsStartTime = Date.now();
  const highlights = await processHighlights(
    searchQuery,
    topRelevantDocuments,
    keywords
  );
  timings.highlights = Date.now() - highlightsStartTime;

  // Apply the highlights to the documents
  topRelevantDocuments = topRelevantDocuments.map((doc) => {
    const highlight = highlights.find((h) => h.id === doc.id);
    return {
      ...doc,
      bodyText: highlight ? highlight.highlightedBodyText : doc.bodyText,
    };
  });

  const systemPrompt = `
      You will be provided with a USER QUERY as well as some SUPPORTING
      DOCUMENTS. Use the supporting documents to answer the user's question.

      The SUPPORTING DOCUMENTS are snippets of ${PlanningSearchJurisdictionNames[jurisdiction]} code.
      It's possible that the SUPPORTING DOCUMENTS do not contain the answer,
      and in those cases it's ok to say that you don't have enough information
      to answer the question.
      `;

  const userPrompt = `
      USER QUERY:
      ${searchQuery}

      SUPPORTING DOCUMENTS:
      ${topRelevantDocuments.map((doc) => doc.text).join("\n\n")}
      `;

  const llmStartTime = Date.now();
  const response = await OpenAIClient.chat.completions.create({
    model: "gpt-4.1-mini",
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
    temperature: 0,
  });
  timings.llmResponse = Date.now() - llmStartTime;

  const responseText = response.choices[0].message.content ?? "";

  if (DEBUG) {
    console.log("Process RAG Query Timings (ms):", {
      ...timings,
      total: Date.now() - startTime,
    });
    console.log(
      `Tokens used: ${response.usage?.prompt_tokens} in/${response.usage?.completion_tokens} out`
    );
  }

  return {
    responseText: responseText,
    documents: topRelevantDocuments,
  };
}
