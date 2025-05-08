import { NextResponse } from "next/server";
import _ from "lodash";
import { RequestBody } from "./apiTypes";
import { processRAGQuery } from "./processRagQuery";

export async function POST(request: Request) {
  try {
    const {
      query: searchQuery,
      conversationHistory,
      jurisdiction,
    } = (await request.json()) as RequestBody;

    const { documents, keywords } = await processRAGQuery(
      searchQuery,
      conversationHistory,
      jurisdiction
    );

    return NextResponse.json({ documents, keywords }, { status: 200 });
  } catch (error) {
    console.error("Full error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete" },
      { status: 500 }
    );
  }
}
