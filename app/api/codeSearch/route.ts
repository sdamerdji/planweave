import { NextResponse } from "next/server";
import _ from "lodash";
import { RequestBody, ResponseBody } from "./apiTypes";
import { processRAGQuery } from "./processRagQuery";
import { db } from "@/src/db";
import { userSearch } from "@/src/db/schema";
export async function POST(request: Request) {
  try {
    const {
      query: searchQuery,
      conversationHistory,
      jurisdiction,
    } = (await request.json()) as RequestBody;

    const result = await processRAGQuery(
      searchQuery,
      conversationHistory,
      jurisdiction
    );

    const savedSearch = await db
      .insert(userSearch)
      .values({
        query: searchQuery,
        responseText: result.responseText,
        documents: result.documents,
        firstSearchId: conversationHistory[0]?.searchId,
        jurisdiction,
      })
      .returning();

    return NextResponse.json(
      { ...result, searchId: savedSearch[0].id },
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
