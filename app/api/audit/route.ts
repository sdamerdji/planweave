import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { hudDocument } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { OpenAIClient } from "@/src/OpenaiClient";
import * as cheerio from "cheerio";
import axios from "axios";
import dotenv from "dotenv";
import { ReadableStream, TransformStream } from "stream/web";
import { auditActivityMatrixCode } from "@/src/AuditMatrixCodes";

dotenv.config();

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const MAX_CONTENT_LENGTH = 5000; // Maximum length for page content

// Regex pattern to split documents by "Office of Community Planning and Development" followed by text and then "PGM Year"
const DOCUMENT_SPLIT_REGEX =
  /Office of Community Planning and Development[\s\S]*?(?=PGM Year)/gi;

// Regex to extract IDIS Activity
const IDIS_ACTIVITY_REGEX = /IDIS Activity:.*$/m;

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
    const systemPrompt = `You are analyzing HUD CDBG fund reports. Extract only the name of the non-profit organization that is the beneficiary of CDBG funds, if any exist. If multiple non-profits are mentioned, list each one on a separate line. If no non-profit is mentioned, respond with "None". Be succinct and direct.`;

    const userPrompt = `What non-profit(s), if any, is mentioned as being the beneficiary of the CDBG funds? Use the information on the 'Accomplishment Narrative', the 'description', and any hint in 'IDIS Activity'.

Here is the document section:
${text}`;

    const response = await OpenAIClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
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
    // Extract content from news results
    const newsContent = newsResults.results
      .map(
        (result: any) => `Title: ${result.title}\nContent: ${result.content}\n`
      )
      .join("\n---\n");

    const systemPrompt = `You are evaluating a non-profit organization based on news reports. Be objective and factual. Only identify clear evidence of waste, fraud, or incompetence. If there's no clear evidence, say "No clear evidence of issues found."`;

    const userPrompt = `Based on the following news results about "${nonProfit}", is there evidence that this non-profit appears to be wasteful, fraudulent, or incompetent? Only answer "Yes" if there is clear evidence in these results.

News Results:
${newsContent}`;

    const response = await OpenAIClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
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

// Extract IDIS Activity from text
function extractIDISActivity(text: string): string {
  const match = text.match(IDIS_ACTIVITY_REGEX);
  if (match && match[0]) {
    return match[0].replace(/\|/g, "").trim();
  }
  return "Unknown IDIS Activity";
}

interface AuditResult {
  idisActivity: string;
  matrixCode: string | null;
  matrixCodeExplanation: string | null;
  nonProfits: Array<{
    name: string;
    evaluation: string;
  }>;
}

async function analyzeHudDocument(
  jurisdiction: string,
  limit?: number,
  progressCallback?: (message: string) => void
): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  const sendProgress = (message: string) => {
    console.log(message);
    if (progressCallback) {
      progressCallback(message);
    }
  };

  try {
    // Query for HUD documents with matching jurisdiction
    sendProgress(`Querying database for jurisdiction: ${jurisdiction}`);
    const documents = await db
      .select()
      .from(hudDocument)
      .where(eq(hudDocument.jurisdiction, jurisdiction));

    if (documents.length === 0) {
      sendProgress(`No HUD documents found for jurisdiction: ${jurisdiction}`);
      return results;
    }

    sendProgress(`Found ${documents.length} HUD document(s).`);

    for (const doc of documents) {
      sendProgress(`Processing document ID: ${doc.id}`);

      // Split the document by pattern
      const fullText = doc.text;
      const splitParts = fullText.split(DOCUMENT_SPLIT_REGEX);

      // Skip the first part as it's before the first "PGM Year"
      const relevantParts = splitParts.slice(1);

      if (relevantParts.length === 0) {
        sendProgress("No relevant parts found in document.");
        continue;
      }

      // Apply limit if specified
      const partsToProcess = limit
        ? relevantParts.slice(0, limit)
        : relevantParts;

      sendProgress(
        `Found ${relevantParts.length} relevant project sections. Processing ${partsToProcess.length}.`
      );

      // Process each part to extract non-profit information
      for (let i = 0; i < partsToProcess.length; i++) {
        const part = "PGM Year" + partsToProcess[i]; // Add back the "PGM Year" that was removed in the split
        const idisActivity = extractIDISActivity(part);
        sendProgress(
          `\nAnalyzing: ${idisActivity} (${i + 1}/${partsToProcess.length})`
        );

        const matrixCodeAudit = await auditActivityMatrixCode(part);

        if (matrixCodeAudit.matrixCode && matrixCodeAudit.explanation) {
          sendProgress(
            `${idisActivity} is incorrectly classified as ${matrixCodeAudit.matrixCode}: ${matrixCodeAudit.explanation}`
          );
        }

        // Extract non-profits from the part
        sendProgress(`Extracting non-profits from section...`);
        const nonProfits = await extractNonProfit(part);

        const auditResult: AuditResult = {
          idisActivity,
          matrixCode: matrixCodeAudit.matrixCode,
          matrixCodeExplanation: matrixCodeAudit.explanation,
          nonProfits: [],
        };

        // Process each non-profit
        for (const nonProfit of nonProfits) {
          sendProgress(`Non-profit identified: ${nonProfit}`);

          let evaluation: string;
          let newsResults: any;

          // Check if we've already evaluated this non-profit
          if (nonProfitCache[nonProfit]) {
            sendProgress(`Using cached results for: ${nonProfit}`);
            evaluation = nonProfitCache[nonProfit].evaluation;
            newsResults = nonProfitCache[nonProfit].newsResults;
          } else {
            // Search for news about the non-profit
            sendProgress(`Searching news about: ${nonProfit}`);
            newsResults = await searchNews(nonProfit, jurisdiction);

            if (newsResults.results && newsResults.results.length > 0) {
              sendProgress(
                `Found ${newsResults.results.length} news articles.`
              );

              // Evaluate the non-profit based on news
              sendProgress(`Evaluating: ${nonProfit}...`);
              evaluation = await evaluateNonProfit(nonProfit, newsResults);
              sendProgress(`Evaluation: ${evaluation}`);
            } else {
              sendProgress("No news found for this organization.");
              evaluation = "No news found";
            }

            // Cache the results
            nonProfitCache[nonProfit] = { evaluation, newsResults };
          }

          auditResult.nonProfits.push({
            name: nonProfit,
            evaluation,
          });
        }

        results.push(auditResult);
      }
    }
  } catch (error) {
    console.error("Error analyzing HUD documents:", error);
    sendProgress(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jurisdiction = searchParams.get("jurisdiction") || "san_diego_ca";
  const limitParam = searchParams.get("limit");
  const streamParam = searchParams.get("stream");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  // For simplicity, we'll just use standard API responses instead of streaming
  // The client can still show real-time updates by making regular polling requests
  try {
    const results = await analyzeHudDocument(jurisdiction, limit);

    return NextResponse.json({
      success: true,
      jurisdiction,
      limit: limit || "all",
      total: results.length,
      results,
    });
  } catch (error) {
    console.error("Error processing audit request:", error);
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
