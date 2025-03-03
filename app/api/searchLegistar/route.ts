import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { documentChunk, eventAgendaText, rawEvent } from "@/src/db/schema";
import { cosineDistance, eq } from "drizzle-orm";

dotenv.config();

// TODO: add OpenAI key to prod environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    const queryEmbedding = Object.values(await embedTexts([query]))[0];

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
          eq(eventAgendaText.legistarEventId, rawEvent.legistarEventId)
        )
        .orderBy(cosineDistance(documentChunk.embedding, queryEmbedding))
        .limit(5)
    ).map((doc) => ({
      title:
        (doc.raw_event.json as any)["EventComment"] ??
        (doc.raw_event.json as any)["EventBodyName"],
      content: doc.event_agenda_text.text,
      snippet: doc.document_chunk.text,
      url: (doc.raw_event.json as any)["EventInSiteURL"],
    }));

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
      ${documents.map((doc, i) => i + ") " + doc.title + "\n\n" + doc.content).join("\n\n")}
      `;

    console.log(userPrompt);

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
