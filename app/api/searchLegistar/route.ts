import { NextResponse } from "next/server";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { documentChunk, eventAgendaText, rawEvent } from "@/src/db/schema";
import { cosineDistance, eq, sql, and, gte } from "drizzle-orm";
import { evaluateDocumentRelevance } from "@/src/EvaluateDocumentRelevance";
import _ from "lodash";
import { OpenAIClient } from "@/src/OpenaiClient";

const USE_CRAG = true;

// TODO: this is kinda dumb but it works ok
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
    const { query: searchQuery, legistarClient, dateFilter } = await request.json();

    const queryEmbedding = Object.values(await embedTexts([searchQuery]))[0];
    const keywords = await getKeywords(searchQuery);
    console.log("extracted keywords", keywords);

    // Build conditions array for the query
    const conditions = [eq(rawEvent.legistarClient, legistarClient)];

    // Add date filter condition if specified
    if (dateFilter && dateFilter !== "all") {
      const days = parseInt(dateFilter);
      if (!isNaN(days)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffDateStr = cutoffDate.toISOString();
        
        // Add date condition to the conditions array
        conditions.push(gte(sql`CAST((${rawEvent.json}->>'EventDate') AS DATE)`, cutoffDateStr));
      }
    }

    // Execute the query with all conditions
    const documents = (
      await db
        .select()
        .from(documentChunk)
        .innerJoin(
          eventAgendaText,
          eq(documentChunk.documentId, eventAgendaText.id)
        )
        .innerJoin(
          rawEvent,
          and(
            eq(eventAgendaText.legistarClient, rawEvent.legistarClient),
            eq(eventAgendaText.legistarEventId, rawEvent.legistarEventId)
          )
        )
        .where(and(...conditions))
        .orderBy(
          // prioritize documents that contain the keywords
          sql`to_tsquery('english', ${keywords.join(" & ")}) @@ to_tsvector('english', ${documentChunk.text}) desc`,
          // then documents that are closer to the query embedding
          cosineDistance(documentChunk.embedding, queryEmbedding)
        )
        .limit(5)
    ).map((doc: any) => ({
      body: (doc.raw_event.json as any)["EventBodyName"],
      dateStr: (doc.raw_event.json as any)["EventDate"],
      content: doc.event_agenda_text.text,
      snippet: doc.document_chunk.text,
      url: (doc.raw_event.json as any)["EventInSiteURL"],
    }));

    let relevantDocuments = documents;
    if (USE_CRAG) {
      const relevance = await Promise.all(
        documents.map((doc: any) => evaluateDocumentRelevance(searchQuery, doc.content))
      );
      console.log("relevance", relevance);

      relevantDocuments = documents.filter((_: any, i: number) => relevance[i] === true);
    }

    // Return early if no relevant documents are found
    if (relevantDocuments.length === 0) {
      return NextResponse.json<SearchLegistarResponse>(
        {
          responseText: "No relevant documents found within timeframe specified.",
          documents: [],
        },
        { status: 201 }
      );
    }

    const systemPrompt = `
      You will be provided with a USER QUERY as well as some SUPPORTING
      DOCUMENTS. Use the supporting documents to answer the user's question.

      The SUPPORTING DOCUMENTS are snippets of agendas for various city
      government meetings. It's possible that the SUPPORTING DOCUMENTS do not
      contain the answer, and in those cases it's ok to say that you don't have
      enough information to answer the question.
      `;

    const userPrompt = `
      USER QUERY:
      ${searchQuery}

      SUPPORTING DOCUMENTS:
      ${relevantDocuments.map((doc: any, i: number) => i + ") " + doc.body + " " + doc.dateStr + "\n\n" + doc.content).join("\n\n")}
      `;

    const response = await OpenAIClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const responseText = response.choices[0].message.content ?? "";

    return NextResponse.json<SearchLegistarResponse>(
      {
        responseText: responseText,
        documents: relevantDocuments,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error on chat completion:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete" },
      { status: 500 }
    );
  }
}
