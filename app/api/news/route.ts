import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const MAX_CONTENT_LENGTH = 5000; // Maximum length for page content

interface NewsResult {
  url: string;
  title: string;
  description: string;
  age: string | null;
  pageAge: string | null;
  pageFetched: string | null;
  breaking: boolean;
  thumbnail: { src: string; original: string; } | null;
  metaUrl: { scheme: string; netloc: string; hostname: string; favicon: string; path: string; } | null;
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
    extraSnippets: result.extra_snippets || []
  };
}

// Function to get search results from Brave Search API
async function getSearchResults(query: string, freshness?: string): Promise<NewsResult[]> {
  if (!BRAVE_API_KEY) {
    throw new Error("BRAVE_API_KEY is not set in environment variables");
  }

  try {
    const response = await axios.get<{ results: RawNewsResult[] }>(
      'https://api.search.brave.com/res/v1/news/search',
      {
        params: {
          q: query,
          count: 20,
          ...(freshness && { freshness })
        },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY
        },
        timeout: 60000
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
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
    .trim()
    .substring(0, MAX_CONTENT_LENGTH);
}

// Function to check if a site is likely to block scraping
function isLikelyToBlock(url: string): boolean {
  const blockedDomains = [
    'nytimes.com',
    'bloomberg.com',
    'wsj.com',
    'ft.com',
    'sammyfans.com',
    'reuters.com',
    'forbes.com',
    'medium.com'
  ];
  
  try {
    const hostname = new URL(url).hostname;
    return blockedDomains.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

// Function to extract page content using Cheerio
async function getPageContent(url: string): Promise<string> {
  if (isLikelyToBlock(url)) {
    return '[Content not available - Site requires subscription or blocks automated access]';
  }

  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (response.status === 403) {
      return '[Content not available - Access denied by the website]';
    }
    
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, iframe, .ads, #ads, .advertisement').remove();
    
    // Extract main content
    let content = '';
    $('article, main, .content, .article-content, .post-content').each((_, elem) => {
      content += $(elem).text() + ' ';
    });
    
    // If no main content found, fall back to body
    if (!content.trim()) {
      content = $('body').text();
    }
    
    const cleanedContent = cleanContent(content);
    
    if (cleanedContent.length < 100) {
      return '[Content appears to be blocked or restricted]';
    }
    
    return cleanedContent;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        return '[Content not available - Access denied by the website]';
      }
      if (error.code === 'ECONNABORTED') {
        return '[Content not available - Request timed out]';
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `[Error fetching content: ${errorMessage}]`;
  }
}

function isEnhancedNewsResult(result: NewsResult | EnhancedNewsResult): result is EnhancedNewsResult {
  return (
    result !== null &&
    'content' in result &&
    result.content !== null &&
    result.content !== undefined &&
    'source_domain' in result &&
    result.source_domain !== null &&
    result.source_domain !== undefined
  );
}

export async function POST(request: Request) {
  try {
    const { keywords, freshness } = await request.json();
    
    if (!keywords || keywords.trim() === '') {
      return NextResponse.json(
        { error: "Keywords are required" },
        { status: 400 }
      );
    }

    if (!BRAVE_API_KEY) {
      return NextResponse.json(
        { error: "BRAVE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const searchResults = await getSearchResults(keywords, freshness);
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
            source_domain: domain
          };
        } catch (error) {
          console.error(`Error processing result for ${url}:`, error);
          return null;
        }
      })
    );
    
    const filteredResults = enhancedResults.filter((result): result is EnhancedNewsResult => result !== null);
    
    return NextResponse.json({
      success: true,
      query: keywords,
      freshness: freshness || "all",
      total_results: filteredResults.length,
      results: filteredResults
    }, { status: 200 });
  } catch (error) {
    console.error("Error processing news request:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
