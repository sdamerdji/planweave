import { NextResponse } from "next/server";

// proxy to avoid CORS
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch PDF" },
        { status: response.status }
      );
    }

    // Create a new response with the PDF content
    const pdfResponse = new NextResponse(response.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="document.pdf"',
      },
    });

    return pdfResponse;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process PDF request" },
      { status: 500 }
    );
  }
}
