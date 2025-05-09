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
  documents: Document[];
  keywords: string[];
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
      documents: [],
      keywords: [],
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
      documents: [],
      keywords: [],
    };
  }

  var topRelevantDocuments = relevantDocuments.slice(0, 5);

  if (DEBUG) {
    console.log("Process RAG Query Timings (ms):", {
      ...timings,
      total: Date.now() - startTime,
    });
  }

  return {
    documents: topRelevantDocuments,
    keywords,
  };
}
