import { NextResponse } from "next/server";
import { OpenAIClient } from "@/src/OpenaiClient";
import { Document } from "../apiTypes";
import {
  PlanningSearchJurisdiction,
  PlanningSearchJurisdictionNames,
} from "@/src/constants";
import { db } from "@/src/db";
import { userSearch } from "@/src/db/schema";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const {
      query: searchQuery,
      conversationHistory,
      jurisdiction,
      documents,
    }: {
      query: string;
      conversationHistory: {
        question: string;
        answer: string;
        searchId?: number;
      }[];
      jurisdiction: PlanningSearchJurisdiction;
      documents: Document[];
    } = await request.json();

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
      ${documents.map((doc) => doc.text).join("\n\n")}
      `;

    const stream = await OpenAIClient.chat.completions.create({
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
      stream: true,
    });

    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        let fullResponse = "";

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          fullResponse += content;
          controller.enqueue(encoder.encode(content));
        }

        // Save the complete response to the database
        const userHash = crypto
          .createHash("sha256")
          .update(
            (request.headers.get("x-forwarded-for") ?? "") +
              (request.headers.get("user-agent") ?? "") +
              (request.headers.get("sec-ch-ua") ?? "")
          )
          .digest("hex");

        await db.insert(userSearch).values({
          query: searchQuery,
          responseText: fullResponse,
          documents,
          firstSearchId: conversationHistory[0]?.searchId,
          jurisdiction,
          jankUserHash: userHash,
        });

        controller.close();
      },
    });

    return new Response(customReadable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Full error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
