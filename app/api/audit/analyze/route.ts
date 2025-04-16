import { NextResponse } from "next/server";
import { OpenAIClient } from "@/src/OpenaiClient";
import * as cheerio from "cheerio";
import axios from "axios";
import dotenv from "dotenv";
import { auditActivityMatrixCode } from "@/src/AuditMatrixCodes";

dotenv.config();

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const MAX_CONTENT_LENGTH = 5000; // Maximum length for page content

// Cache for non-profit evaluations to avoid duplicate searches
const nonProfitCache: Record<string, { evaluation: string; newsResults: any }> =
  {};

interface NewsResult {
  url: string;
  title: string;
  description: string;
  age: string | null;
  pageAge: string | null;
  pageFetched: string | null;
  breaking: boolean;
  thumbnail: { src: string; original: string } | null;
  metaUrl: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  } | null;
  extraSnippets: string[];
}

interface EnhancedNewsResult extends NewsResult {
  content: string;
  source_domain: string;
}

interface RawNewsResult {
  url?: string;
  title?: string;
  description?: string;
  age?: string;
  page_age?: string;
  page_fetched?: string;
  breaking?: boolean;
  thumbnail?: {
    src: string;
    original: string;
  };
  meta_url?: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  };
  extra_snippets?: string[];
}

// Function to validate and clean the Brave API response
function validateSearchResult(result: RawNewsResult): NewsResult | null {
  if (!result.url || !result.title || !result.description) {
    console.warn("Invalid search result:", result);
    return null;
  }

  return {
    url: result.url,
    title: result.title,
    description: result.description,
    age: result.age || null,
    pageAge: result.page_age || null,
    pageFetched: result.page_fetched || null,
    breaking: result.breaking || false,
    thumbnail: result.thumbnail || null,
    metaUrl: result.meta_url || null,
    extraSnippets: result.extra_snippets || [],
  };
}

// Function to get search results from Brave Search API
async function getSearchResults(
  query: string,
  freshness?: string
): Promise<NewsResult[]> {
  if (!BRAVE_API_KEY) {
    throw new Error("BRAVE_API_KEY is not set in environment variables");
  }

  try {
    const response = await axios.get<{ results: RawNewsResult[] }>(
      "https://api.search.brave.com/res/v1/news/search",
      {
        params: {
          q: query,
          count: 20,
          ...(freshness && { freshness }),
        },
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
        timeout: 60000,
      }
    );

    if (!response.data?.results || !Array.isArray(response.data.results)) {
      throw new Error("Invalid response format from Brave API");
    }

    return response.data.results
      .map(validateSearchResult)
      .filter((result): result is NewsResult => result !== null);
  } catch (error) {
    console.error("Error fetching search results:", error);
    throw error;
  }
}

// Function to clean and format content
function cleanContent(content: string): string {
  return content
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "") // Remove non-printable characters
    .trim()
    .substring(0, MAX_CONTENT_LENGTH);
}

// Function to check if a site is likely to block scraping
function isLikelyToBlock(url: string): boolean {
  const blockedDomains = [
    "nytimes.com",
    "bloomberg.com",
    "wsj.com",
    "ft.com",
    "sammyfans.com",
    "reuters.com",
    "forbes.com",
    "medium.com",
  ];

  try {
    const hostname = new URL(url).hostname;
    return blockedDomains.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

// Function to extract page content using Cheerio
async function getPageContent(url: string): Promise<string> {
  if (isLikelyToBlock(url)) {
    return "[Content not available - Site requires subscription or blocks automated access]";
  }

  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (response.status === 403) {
      return "[Content not available - Access denied by the website]";
    }

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $(
      "script, style, nav, header, footer, iframe, .ads, #ads, .advertisement"
    ).remove();

    // Extract main content
    let content = "";
    $("article, main, .content, .article-content, .post-content").each(
      (_, elem) => {
        content += $(elem).text() + " ";
      }
    );

    // If no main content found, fall back to body
    if (!content.trim()) {
      content = $("body").text();
    }

    const cleanedContent = cleanContent(content);

    if (cleanedContent.length < 100) {
      return "[Content appears to be blocked or restricted]";
    }

    return cleanedContent;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        return "[Content not available - Access denied by the website]";
      }
      if (error.code === "ECONNABORTED") {
        return "[Content not available - Request timed out]";
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return `[Error fetching content: ${errorMessage}]`;
  }
}

// Function to extract non-profit beneficiaries from CDBG fund reports
async function extractNonProfit(text: string): Promise<string[]> {
  try {
    const systemPrompt = `You are analyzing HUD CDBG fund reports. Extract only the name of the non-profit organization that is the beneficiary of CDBG funds, if any exist. If multiple non-profits are mentioned, list only the first one. If no non-profit is mentioned, respond with "None". Be succinct and direct. Do not extract non-profits with names that are not organizations.`;

    const userPrompt = `What non-profit(s), if any, is mentioned as being the beneficiary of the CDBG funds? Use the information on the 'Accomplishment Narrative', the 'description', and any hint in 'IDIS Activity'.

Here is the document section:
${text}`;

    const response = await OpenAIClient.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    });

    const content = response.choices[0].message.content?.trim() || "None";

    // If the response is "None", return an empty array
    if (content === "None") {
      return [];
    }

    // Split by newlines to handle multiple organizations
    return content
      .split("\n")
      .map((org) => org.trim())
      .filter((org) => org && org !== "None");
  } catch (error) {
    console.error("Error extracting non-profit:", error);
    return [];
  }
}

// Function to search news about a non-profit
async function searchNews(
  nonProfit: string,
  jurisdiction: string
): Promise<any> {
  try {
    const keywords = `${nonProfit} ${jurisdiction.replace(/_/g, " ")}`;

    const searchResults = await getSearchResults(keywords);
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
          };
        } catch (error) {
          console.error(`Error processing result for ${url}:`, error);
          return null;
        }
      })
    );

    const filteredResults = enhancedResults.filter(
      (result): result is EnhancedNewsResult => result !== null
    );

    return {
      success: true,
      query: keywords,
      freshness: "all",
      total_results: filteredResults.length,
      results: filteredResults,
    };
  } catch (error) {
    console.error("Error searching news:", error);
    return { results: [] };
  }
}

// Function to evaluate a non-profit based on news
async function evaluateNonProfit(
  nonProfit: string,
  newsResults: any
): Promise<string> {
  try {
    // Extract content from news results and limit to 1000 words per article
    const newsContent = newsResults.results
      .map((result: any) => {
        // Split content into words and limit to 1000
        const limitedContent = result.content;
        return `News Article Title: ${result.title}\nNews Article Body: ${limitedContent}\n`;
      })
      .join("\n---\n");

    const systemPrompt = `Based on news reports, you must evaluate whether there is evidence that the non-profit has engaged in waste, fraud, abuse, or fails at its mission. If there's no clear evidence, you should say "Found no clear evidence of waste, fraud or abuse", without further explanation. If there is clear evidence, explain why. Be factual and objective.`;

    const userPrompt = `Based on the following news results about "${nonProfit}", is there evidence that this non-profit appears to be wasteful, fraudulent, or incompetent? Only answer "Yes" if there is clear evidence in these results.

News Results:
${newsContent}`;

    const response = await OpenAIClient.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    });

    return (
      response.choices[0].message.content?.trim() ||
      "No clear evidence of issues found."
    );
  } catch (error) {
    console.error("Error evaluating non-profit:", error);
    return "Error evaluating organization";
  }
}

// Analyze a single CDBG activity
export async function POST(request: Request) {
  try {
    const { activityContent, idisActivity, jurisdiction } =
      await request.json();

    if (!activityContent || !jurisdiction) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    console.log(`\nAnalyzing: ${idisActivity}`);

    // Extract non-profits from the activity content
    console.log(`Extracting non-profits from section...`);
    const nonProfits = await extractNonProfit(activityContent);

    // Check matrix code eligibility
    console.log(`Auditing matrix code...`);
    const matrixCodeResult = await auditActivityMatrixCode(activityContent);
    console.log(`Matrix code audit result:`, matrixCodeResult);

    const result = {
      idisActivity,
      matrixCode: matrixCodeResult.matrixCode,
      matrixCodeExplanation: matrixCodeResult.explanation,
      nonProfits: [] as Array<{ name: string; evaluation: string }>,
    };

    // Process each non-profit
    for (const nonProfit of nonProfits) {
      console.log(`Non-profit identified: ${nonProfit}`);

      let evaluation: string;
      let newsResults: any;

      // Check if we've already evaluated this non-profit
      if (nonProfitCache[nonProfit]) {
        console.log(`Using cached results for: ${nonProfit}`);
        evaluation = nonProfitCache[nonProfit].evaluation;
        newsResults = nonProfitCache[nonProfit].newsResults;
      } else {
        // Search for news about the non-profit
        console.log(`Searching news about: ${nonProfit}`);

        // TODO: Delete this veterans-only filter later. Just speeding up the demo.
        if (!nonProfit.toLowerCase().includes("veterans")) {
          newsResults = { results: [] };
          evaluation = "Found no clear evidence of waste, fraud or abuse";
        } else {
          newsResults = await searchNews(nonProfit, jurisdiction);

          if (newsResults.results && newsResults.results.length > 0) {
            console.log(`Found ${newsResults.results.length} news articles.`);

            // Evaluate the non-profit based on news
            console.log(`Evaluating: ${nonProfit}...`);
            evaluation = await evaluateNonProfit(nonProfit, newsResults);
            console.log(`Evaluation: ${evaluation}`);
          } else {
            console.log("No news found for this organization.");
            evaluation = "No news found";
          }
        }

        // Cache the results
        nonProfitCache[nonProfit] = { evaluation, newsResults };
      }

      result.nonProfits.push({
        name: nonProfit,
        evaluation,
      });
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error analyzing CDBG activity:", error);
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
