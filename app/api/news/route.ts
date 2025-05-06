import { NextResponse } from "next/server";
import {
  getSearchResults,
  getPageContent,
  isEnhanced,
  NewsResult,
  EnhancedNewsResult,
  EnhancedResult,
} from "@/src/search";

export async function POST(request: Request) {
  try {
    const { keywords, freshness } = await request.json();

    if (!keywords || keywords.trim() === "") {
      return NextResponse.json(
        { error: "Keywords are required" },
        { status: 400 }
      );
    }

    const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
    if (!BRAVE_API_KEY) {
      return NextResponse.json(
        { error: "BRAVE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Get news search results
    const searchResults = await getSearchResults(keywords, {
      searchType: "news",
      freshness,
    });

    const processedUrls = new Set<string>();

    const enhancedResults = await Promise.all(
      searchResults.map(async (result: NewsResult) => {
        const url = result.url;

        if (!url || processedUrls.has(url)) {
          return null;
        }

        processedUrls.add(url);

        try {
          const domain = new URL(url).hostname;
          const pageContent = await getPageContent(url);

          return {
            ...result,
            content: pageContent,
            source_domain: domain,
            originalResult: result,
          };
        } catch (error) {
          console.error(`Error processing result for ${url}:`, error);
          return null;
        }
      })
    );

    // Filter out null results and ensure type safety
    const filteredResults = enhancedResults.filter(
      (result) => result !== null
    ) as EnhancedNewsResult[];

    return NextResponse.json(
      {
        success: true,
        query: keywords,
        freshness: freshness || "all",
        total_results: filteredResults.length,
        results: filteredResults,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing news request:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
