import { NextResponse } from "next/server";
import _ from "lodash";
import { RequestBody, ResponseBody } from "./apiTypes";
import { processRAGQuery } from "./processRagQuery";

export async function POST(request: Request) {
  try {
    const { query: searchQuery, conversationHistory } =
      (await request.json()) as RequestBody;

    const result = await processRAGQuery(searchQuery, conversationHistory);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Full error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete" },
      { status: 500 }
    );
  }
}
