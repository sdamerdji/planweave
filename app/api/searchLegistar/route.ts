import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { documentChunk, eventAgendaText, rawEvent } from "@/src/db/schema";
import { cosineDistance, eq, sql, and } from "drizzle-orm";

dotenv.config();

// TODO: add OpenAI key to prod environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    Separate your keywords with commas.
    `;

  const response = await openai.chat.completions.create({
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
    .flatMap((keyword) => keyword.split(" "));
};

export async function POST(request: Request) {
  try {
    const { query, legistarClient } = await request.json();

    const queryEmbedding = Object.values(await embedTexts([query]))[0];
    const keywords = await getKeywords(query);
    console.log("extracted keywords", keywords);

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
        .where(eq(rawEvent.legistarClient, legistarClient))
        .orderBy(
          // prioritize documents that contain the keywords
          sql`to_tsquery('english', ${keywords.join(" & ")}) @@ to_tsvector('english', ${documentChunk.text}) desc`,
          // then documents that are closer to the query embedding
          cosineDistance(documentChunk.embedding, queryEmbedding)
        )
        .limit(5)
    ).map((doc) => ({
      body: (doc.raw_event.json as any)["EventBodyName"],
      dateStr: (doc.raw_event.json as any)["EventDate"],
      content: doc.event_agenda_text.text,
      snippet: doc.document_chunk.text,
      url: (doc.raw_event.json as any)["EventInSiteURL"],
    }));

    console.log(
      "found documents",
      documents.map((doc) => [doc.dateStr, doc.url])
    );

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
      ${query}

      SUPPORTING DOCUMENTS:
      ${documents.map((doc, i) => i + ") " + doc.body + " " + doc.dateStr + "\n\n" + doc.content).join("\n\n")}
      `;

    const response = await openai.chat.completions.create({
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
        documents,
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
