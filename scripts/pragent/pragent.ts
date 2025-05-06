/**
 * Script to find public records request emails for a sample of jurisdictions
 *
 * This script samples 20 random jurisdictions, excluding those with "CDP" in the name,
 * and uses getEmails.ts functionality to find the most relevant email address
 * for public records requests for each jurisdiction.
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { getSearchResults, getPageContent, WebResult } from "../../src/search";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import axios from "axios";

// Load environment variables
dotenv.config();

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const MAILTO_REGEX =
  /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi;
const CONTEXT_WINDOW = 300; // Characters of context to capture around each email
const RESULTS_DIR = path.join(__dirname, "results");

// Interface for jurisdiction data
interface Jurisdiction {
  id: number;
  jurisdiction: string;
  state: string;
  isCity: boolean;
  isCounty: boolean;
}

// Interface for detailed email information
interface EmailContext {
  email: string;
  url: string;
  title: string;
  description: string;
  context: string; // Text surrounding the email
  source: string; // 'text' or 'mailto' or 'href'
}

// Interface for query result row
interface JurisdictionRow {
  id: number;
  jurisdiction: string;
  state: string;
  isCity: boolean;
  isCounty: boolean;
}

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Helper function to extract context around an email match
function getEmailContext(content: string, emailMatch: RegExpExecArray): string {
  const startPos = Math.max(0, emailMatch.index - CONTEXT_WINDOW);
  const endPos = Math.min(
    content.length,
    emailMatch.index + emailMatch[0].length + CONTEXT_WINDOW
  );
  return content.substring(startPos, endPos).trim();
}

// Helper function to extract emails from content text with context
function extractEmailsWithContext(
  content: string,
  url: string,
  title: string,
  description: string
): EmailContext[] {
  const emailContexts: EmailContext[] = [];
  const emailSet = new Set<string>();

  // Find all email matches with RegExp.exec to get indices
  const regex = new RegExp(EMAIL_REGEX);
  let match;

  while ((match = regex.exec(content)) !== null) {
    const email = match[0];
    if (!emailSet.has(email)) {
      emailSet.add(email);
      emailContexts.push({
        email,
        url,
        title,
        description,
        context: getEmailContext(content, match),
        source: "text",
      });
    }
  }

  return emailContexts;
}

// Helper function to extract emails from HTML including mailto links with context
async function extractAllEmailsWithContext(
  url: string,
  textContent: string,
  title: string,
  description: string
): Promise<EmailContext[]> {
  // Get emails from text content first
  const emailContexts = extractEmailsWithContext(
    textContent,
    url,
    title,
    description
  );
  const emailSet = new Set(emailContexts.map((ctx) => ctx.email));

  try {
    // Fetch raw HTML to find mailto links
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    // Parse HTML
    const $ = cheerio.load(response.data);

    // Find all mailto links
    $('a[href^="mailto:"]').each((_, element) => {
      const href = $(element).attr("href") || "";
      const match = href.match(MAILTO_REGEX);

      if (match && match[1]) {
        const email = match[1];
        if (!emailSet.has(email)) {
          emailSet.add(email);
          // Get surrounding context
          const elementHtml = $.html(element);
          const parentHtml = $.html($(element).parent());
          emailContexts.push({
            email,
            url,
            title,
            description,
            context: parentHtml || elementHtml,
            source: "mailto",
          });
        }
      }
    });

    // Also check all other links for potential email addresses
    $("a").each((_, element) => {
      const href = $(element).attr("href") || "";
      const emailMatches = href.match(EMAIL_REGEX);

      if (emailMatches) {
        emailMatches.forEach((email) => {
          if (!emailSet.has(email)) {
            emailSet.add(email);
            // Get surrounding context
            const elementHtml = $.html(element);
            const parentHtml = $.html($(element).parent());
            emailContexts.push({
              email,
              url,
              title,
              description,
              context: parentHtml || elementHtml,
              source: "href",
            });
          }
        });
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      console.log(`403 status received from URL: ${url}`);
    } else if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(`404 status received from URL: ${url}`);
    } else {
      console.error(`Error extracting emails from HTML for ${url}:`, error);
    }
  }

  return emailContexts;
}

// Function to evaluate which email is most relevant for public records requests
async function evaluateMostRelevantEmail(
  emailContexts: EmailContext[],
  location: string = "Orange County",
  isCity: boolean = false,
  state: string = "California"
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY || emailContexts.length === 0) {
    return null;
  }

  console.log(
    `\nEvaluating ${emailContexts.length} emails for relevance to "${location}, ${state}" public records requests...`
  );

  const systemPrompt = `
You are a helpful assistant with expertise in public records requests. You need to identify the most appropriate email address to contact for filing a public records request to a specific jurisdiction.

Analyze each email address and its context carefully. Focus on these criteria:
1. The email should be specific to public records requests or the city/county clerk. You can safely ignore sheriffs, police, etc
2. It must be for the correct jurisdiction (${location}). This is a ${isCity ? "city" : "county"} in ${state}.
3. Official government emails (.gov) are preferred
4. Pay close attention to wording like "records request", "public records", "FOIA", or "clerk"

Return ONLY the single most relevant email address. Nothing else. No explanation, no prefix, no quotes. Just the raw email address. If none of
the emails are relevant, return None.
`;

  const userPrompt = emailContexts
    .map((ctx, index) => {
      return `
Email ${index + 1}: ${ctx.email}
URL: ${ctx.url}
Title: ${ctx.title}
Description: ${ctx.description}
Context: ${ctx.context}
------------------`;
    })
    .join("\n");

  console.log("\nPrompt being sent to OpenAI:");
  console.log("============================");
  console.log(userPrompt);
  console.log("============================\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    });

    const result = response.choices[0].message.content?.trim();
    console.log(
      `Best email for public records requests in ${location}, ${state}: ${result}`
    );
    return result === "None" ? null : result || null;
  } catch (error) {
    console.error("Error evaluating emails with OpenAI:", error);
    return null;
  }
}

// Function to process search results
async function processSearchResults(
  results: WebResult[],
  jurisdiction: Jurisdiction
): Promise<string | null> {
  console.log(
    `\nProcessing ${results.length} search results for ${jurisdiction.jurisdiction}, ${jurisdiction.state}...`
  );

  const allEmailsByUrl: Record<string, string[]> = {};
  const allEmailContexts: EmailContext[] = [];
  const enhancedResults = [];

  for (const result of results) {
    try {
      const url = result.url;
      const title = result.title;
      const description = result.description;

      console.log(`Fetching content from: ${url}`);
      const content = await getPageContent(url, null);
      const domain = new URL(url).hostname;

      const enhanced = {
        url,
        title,
        description,
        metaUrl: result.metaUrl,
        content,
        source_domain: domain,
        originalResult: result,
      };

      enhancedResults.push(enhanced);

      // Extract emails with context from both text content and HTML
      const emailContexts = await extractAllEmailsWithContext(
        url,
        content,
        title,
        description
      );
      if (emailContexts.length > 0) {
        allEmailsByUrl[url] = emailContexts.map((ctx) => ctx.email);
        allEmailContexts.push(...emailContexts);
        console.log(`Found ${emailContexts.length} email(s) at ${url}`);
      }
    } catch (error) {
      console.error(`Error processing ${result.url}:`, error);
    }
  }

  // Print summary
  const totalEmails = Object.values(allEmailsByUrl).reduce(
    (sum, emails) => sum + emails.length,
    0
  );
  const uniqueEmails = new Set<string>();
  Object.values(allEmailsByUrl).forEach((emails) => {
    emails.forEach((email) => uniqueEmails.add(email));
  });

  console.log(
    `\nSearch Summary for ${jurisdiction.jurisdiction}, ${jurisdiction.state}:`
  );
  console.log(`- Total URLs processed: ${enhancedResults.length}`);
  console.log(`- URLs with emails: ${Object.keys(allEmailsByUrl).length}`);
  console.log(`- Total emails found: ${totalEmails}`);
  console.log(`- Unique emails found: ${uniqueEmails.size}`);

  if (uniqueEmails.size > 0) {
    console.log("\n=== All Unique Emails ===");
    Array.from(uniqueEmails).forEach((email) => console.log(email));
  }

  // Find most relevant email using OpenAI
  const mostRelevantEmail = await evaluateMostRelevantEmail(
    allEmailContexts,
    jurisdiction.jurisdiction,
    jurisdiction.isCity,
    jurisdiction.state
  );

  return mostRelevantEmail;
}

// Running a single jurisdiction for testing
const TEST_MODE = false; // Set to true to only process the first jurisdiction

// Main function to sample jurisdictions and find emails
async function main() {
  console.log(
    "Starting to sample jurisdictions and find public records emails"
  );

  try {
    // Sample jurisdictions without "CDP" in the name
    const queryResult = await db.execute(sql`
      SELECT id, jurisdiction, state, is_city as "isCity", is_county as "isCounty"
      FROM jurisdictions
      WHERE jurisdiction NOT LIKE '%CDP%'
      ORDER BY RANDOM()
      LIMIT ${TEST_MODE ? 1 : 5}
    `);

    // Check and extract rows from the query result
    if (
      !queryResult ||
      typeof queryResult !== "object" ||
      !("rows" in queryResult) ||
      !Array.isArray(queryResult.rows)
    ) {
      throw new Error(
        `Invalid query result structure: ${JSON.stringify(queryResult).substring(0, 200)}...`
      );
    }

    const jurisdictions = queryResult.rows.map((row) => ({
      id: Number(row.id),
      jurisdiction: String(row.jurisdiction),
      state: String(row.state),
      isCity: Boolean(row.isCity),
      isCounty: Boolean(row.isCounty),
    })) as Jurisdiction[];

    console.log(
      `Selected ${jurisdictions.length} jurisdictions for processing`
    );

    // Log the jurisdictions for debugging
    console.log(
      "Jurisdictions to process:",
      jurisdictions.map(
        (j) =>
          `${j.jurisdiction}, ${j.state} (City: ${j.isCity}, County: ${j.isCounty})`
      )
    );

    // Create a results object to store all findings
    const results: {
      jurisdiction: string;
      state: string;
      isCity: boolean;
      isCounty: boolean;
      email: string | null;
    }[] = [];

    // Process each jurisdiction
    for (const jurisdiction of jurisdictions) {
      console.log(`\n======================================`);
      console.log(
        `Processing ${jurisdiction.jurisdiction}, ${jurisdiction.state}`
      );
      console.log(`======================================`);

      const searchQuery = `public records request email clerk ${jurisdiction.jurisdiction}, ${jurisdiction.state}`;

      try {
        // Web search
        const searchResults = await getSearchResults(searchQuery, {
          searchType: "web",
          count: 5, // Limit to 5 results per jurisdiction to avoid overloading
        });

        // If we got results, process them
        if (searchResults.length > 0) {
          const mostRelevantEmail = await processSearchResults(
            searchResults,
            jurisdiction
          );

          // Add to results
          results.push({
            jurisdiction: jurisdiction.jurisdiction,
            state: jurisdiction.state,
            isCity: jurisdiction.isCity,
            isCounty: jurisdiction.isCounty,
            email: mostRelevantEmail,
          });

          console.log(
            `Found email for ${jurisdiction.jurisdiction}: ${mostRelevantEmail || "None"}`
          );
        } else {
          console.log(
            `No search results for ${jurisdiction.jurisdiction}, ${jurisdiction.state}`
          );
          results.push({
            jurisdiction: jurisdiction.jurisdiction,
            state: jurisdiction.state,
            isCity: jurisdiction.isCity,
            isCounty: jurisdiction.isCounty,
            email: null,
          });
        }
      } catch (error) {
        console.error(`Error processing ${jurisdiction.jurisdiction}:`, error);
        results.push({
          jurisdiction: jurisdiction.jurisdiction,
          state: jurisdiction.state,
          isCity: jurisdiction.isCity,
          isCounty: jurisdiction.isCounty,
          email: null,
        });
      }
    }

    // Save all results to a file
    fs.writeFileSync(
      path.join(RESULTS_DIR, "jurisdiction-emails.json"),
      JSON.stringify(results, null, 2)
    );

    // Print final summary
    console.log("\n======================================");
    console.log("FINAL RESULTS SUMMARY");
    console.log("======================================");

    for (const result of results) {
      console.log(
        `${result.jurisdiction}, ${result.state}: ${result.email || "None"}`
      );
    }

    console.log(
      `\nProcess complete. Results saved to ${path.join(RESULTS_DIR, "jurisdiction-emails.json")}`
    );

    // Close database connection
    await pool.end();
  } catch (error) {
    console.error("Error in main process:", error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
