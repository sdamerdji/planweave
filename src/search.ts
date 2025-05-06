import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";

// Load environment variables and log status
dotenv.config();
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

// Log Brave API key status
console.log("\nBrave API Configuration:");
console.log("======================");
if (BRAVE_API_KEY) {
  console.log("BRAVE_API_KEY: ✓ Found");
  console.log(`Key length: ${BRAVE_API_KEY.length} characters`);
  console.log(`Key prefix: ${BRAVE_API_KEY.substring(0, 4)}...`);
} else {
  console.log("BRAVE_API_KEY: ✗ Missing");
}

const MAX_CONTENT_LENGTH = 5000; // Maximum length for page content

// Define search types
export type SearchType = "news" | "web";

// Base interface for all search results
export interface SearchResultBase {
  url: string;
  title: string;
  description: string;
  metaUrl: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  } | null;
}

// News-specific result fields
export interface NewsResult extends SearchResultBase {
  age: string | null;
  pageAge: string | null;
  pageFetched: string | null;
  breaking: boolean;
  thumbnail: { src: string; original: string } | null;
  extraSnippets: string[];
}

// Web-specific result fields
export interface WebResult extends SearchResultBase {
  deepResults: any[] | null;
  language: string | null;
  familyFriendly: boolean;
}

// Enhanced result with content
export interface EnhancedResult<T extends SearchResultBase> {
  url: string;
  title: string;
  description: string;
  metaUrl: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  } | null;
  content: string;
  source_domain: string;
  originalResult: T;
}

// Type aliases for convenience
export type EnhancedNewsResult = EnhancedResult<NewsResult>;
export type EnhancedWebResult = EnhancedResult<WebResult>;

// Raw API response interfaces
interface RawSearchResultBase {
  url?: string;
  title?: string;
  description?: string;
  meta_url?: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  };
}

interface RawNewsResult extends RawSearchResultBase {
  age?: string;
  page_age?: string;
  page_fetched?: string;
  breaking?: boolean;
  thumbnail?: {
    src: string;
    original: string;
  };
  extra_snippets?: string[];
}

interface RawWebResult extends RawSearchResultBase {
  deep_results?: any[];
  language?: string;
  family_friendly?: boolean;
}

// Function to validate and clean the Brave API news response
export function validateSearchResult(result: RawNewsResult): NewsResult | null {
  if (!result.url || !result.title || !result.description) {
    console.warn("Invalid news search result:", result);
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

// Function to validate and clean the Brave API web response
export function validateWebResult(result: RawWebResult): WebResult | null {
  if (!result.url || !result.title || !result.description) {
    console.warn("Invalid web search result:", result);
    return null;
  }

  return {
    url: result.url,
    title: result.title,
    description: result.description,
    deepResults: result.deep_results || null,
    language: result.language || null,
    familyFriendly: result.family_friendly || false,
    metaUrl: result.meta_url || null,
  };
}

// Function to get search results from Brave Search API
export async function getSearchResults<T extends SearchType>(
  query: string,
  options: {
    searchType?: T;
    count?: number;
    freshness?: string;
  } = {}
): Promise<T extends "news" ? NewsResult[] : WebResult[]> {
  // Enhanced API key validation
  if (!BRAVE_API_KEY) {
    console.error("ERROR: BRAVE_API_KEY is not set in environment variables");
    throw new Error("BRAVE_API_KEY is not set in environment variables");
  }

  const { searchType = "news" as T, count = 10, freshness } = options;

  try {
    const endpoint =
      searchType === "news"
        ? "https://api.search.brave.com/res/v1/news/search"
        : "https://api.search.brave.com/res/v1/web/search";

    console.log("\nMaking API Request:");
    console.log("==================");
    console.log(`Type: ${searchType}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Query: "${query}"`);
    console.log(`Count: ${count}`);
    if (freshness) console.log(`Freshness: ${freshness}`);

    const response = await axios.get(endpoint, {
      params: {
        q: query,
        count,
        ...(freshness && { freshness }),
      },
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
      timeout: 60000,
    });

    console.log("\nAPI Response:");
    console.log("============");
    console.log(`Status: ${response.status}`);
    // console.log(`Response structure: ${Object.keys(response.data).join(", ")}`);

    // For debugging
    if (!response.data) {
      console.error("Error: Empty response data");
      throw new Error("Empty response data from Brave API");
    }

    // Check if we got an error response
    if (response.status === 403) {
      console.log(`URL attempted: ${endpoint}`);
    } else if (response.data.error) {
      console.error("API error:", response.data.error);
      throw new Error(`Brave API error: ${response.data.error}`);
    }

    // Handle different response structures
    let resultsArray: any[] = [];

    // Structure check 1: direct results property
    if (response.data.results && Array.isArray(response.data.results)) {
      resultsArray = response.data.results;
    }
    // Structure check 2: nested in "web" or "news" property
    else if (
      response.data.web?.results &&
      Array.isArray(response.data.web.results)
    ) {
      resultsArray = response.data.web.results;
    } else if (
      response.data.news?.results &&
      Array.isArray(response.data.news.results)
    ) {
      resultsArray = response.data.news.results;
    }
    // Handle case where API key is not working correctly or no results found
    else if (response.data.query) {
      console.log(
        "API returned query info with valid structure but no results found"
      );
      if (searchType === "news") {
        console.log(
          "Detailed response:",
          JSON.stringify(response.data, null, 2).substring(0, 500) + "..."
        );
      } else {
        console.log(
          "Number of results in response structure:",
          response.data.web?.results ? response.data.web.results.length : 0
        );
      }
      return [] as any;
    } else {
      console.error(
        "Missing results in response:",
        JSON.stringify(response.data).substring(0, 200) + "..."
      );
      throw new Error(
        `Invalid response format from Brave API for ${searchType} search: results property not found in expected locations`
      );
    }

    console.log(`Got ${resultsArray.length} results from Brave API`);

    if (searchType === "news") {
      return resultsArray
        .map((result: RawNewsResult) => validateSearchResult(result))
        .filter((result): result is NewsResult => result !== null) as any;
    } else {
      return resultsArray
        .map((result: RawWebResult) => validateWebResult(result))
        .filter((result): result is WebResult => result !== null) as any;
    }
  } catch (error) {
    console.error(`Error fetching ${searchType} search results:`, error);

    // Additional error info for axios errors
    if (axios.isAxiosError(error) && error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }

    throw error;
  }
}

// Function to check if a site is likely to block scraping
export function isLikelyToBlock(url: string): boolean {
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

/**
 * Cleans and formats the content text
 * @param content The raw content to clean
 * @param maxLength Maximum length of content to return (null for unlimited)
 * @returns Cleaned content string
 */
function cleanContent(
  content: string,
  maxLength: number | null = MAX_CONTENT_LENGTH
): string {
  const cleaned = content
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "") // Remove non-printable characters
    .trim();

  return maxLength !== null ? cleaned.substring(0, maxLength) : cleaned;
}

/**
 * Extracts and cleans content from a webpage
 * @param url The URL to fetch content from
 * @param maxContentLength Maximum length of content to return (null for unlimited)
 * @returns Cleaned page content as string
 */
export async function getPageContent(
  url: string,
  maxContentLength: number | null = MAX_CONTENT_LENGTH
): Promise<string> {
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

    const cleanedContent = cleanContent(content, maxContentLength);

    // Still check for minimum length to detect blocked content
    if (cleanedContent.length < 100) {
      return "[Content appears to be blocked or restricted]";
    }

    return cleanedContent;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        console.log(`403 status received from URL: ${url}`);
        return "[Content not available]";
      }
      if (error.code === "ECONNABORTED") {
        return "[Content not available - Request timed out]";
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return `[Error fetching content: ${errorMessage}]`;
  }
}

// Type guard for enhanced results
export function isEnhanced<T extends SearchResultBase>(
  result: T | EnhancedResult<T>
): result is EnhancedResult<T> {
  return (
    result !== null &&
    "content" in result &&
    "source_domain" in result &&
    "originalResult" in result
  );
}
