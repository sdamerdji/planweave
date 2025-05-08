import { NextResponse } from "next/server";
import { Document } from "../apiTypes";
import { processHighlights } from "../highlightText";

export async function POST(request: Request) {
  try {
    const {
      query: searchQuery,
      documents,
      keywords,
    }: {
      query: string;
      documents: Document[];
      keywords: string[];
    } = await request.json();

    const highlights = await processHighlights(
      searchQuery,
      documents,
      keywords
    );

    // Apply the highlights to the documents
    const highlightedDocuments = documents.map((doc) => {
      const highlight = highlights.find((h) => h.id === doc.id);
      return {
        ...doc,
        bodyText: highlight ? highlight.highlightedBodyText : doc.bodyText,
      };
    });

    return NextResponse.json(
      { documents: highlightedDocuments },
      { status: 200 }
    );
  } catch (error) {
    console.error("Full error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to highlight text" },
      { status: 500 }
    );
  }
}
