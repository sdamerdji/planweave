import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jurisdiction = searchParams.get("jurisdiction") || "san_diego_ca";
  const limitParam = searchParams.get("limit");

  // This endpoint is now a simple wrapper that redirects to the activities endpoint
  return NextResponse.json({
    success: false,
    message:
      "This endpoint has been refactored. Please use /api/audit/activities to get activities and /api/audit/analyze to analyze them.",
    redirectTo: `/api/audit/activities?jurisdiction=${encodeURIComponent(jurisdiction)}${limitParam ? `&limit=${limitParam}` : ""}`,
  });
}
