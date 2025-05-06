/**
 * Script to test web search functionality for finding public records contact information
 *
 * This script searches for information about public records in Orange County, California
 * and extracts email addresses from the results.
 */

import { getSearchResults, getPageContent, WebResult } from "../../src/search";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import * as cheerio from "cheerio";
import axios from "axios";
import OpenAI from "openai";

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Verify API key
if (!process.env.BRAVE_API_KEY) {
  console.error("\nERROR: BRAVE_API_KEY is not set in environment variables");
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "\nWARNING: OPENAI_API_KEY is not set - email evaluation will be skipped"
  );
}

// Constants
const SEARCH_QUERY = "public records act orange california";
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const MAILTO_REGEX =
  /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi;
const RESULTS_DIR = path.join(__dirname, "results");
const CONTEXT_WINDOW = 300; // Characters of context to capture around each email

// Interface for detailed email information
interface EmailContext {
  email: string;
  url: string;
  title: string;
  description: string;
  context: string; // Text surrounding the email
  source: string; // 'text' or 'mailto' or 'href'
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
          // Get surrounding context for the element
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
            // Get surrounding context for the element
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
    console.error(`Error extracting emails from HTML for ${url}:`, error);
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
    `\nEvaluating ${emailContexts.length} emails for relevance to "${location}" public records requests...`
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
      `Best email for public records requests in ${location}: ${result}`
    );
    return result || null;
  } catch (error) {
    console.error("Error evaluating emails with OpenAI:", error);
    return null;
  }
}

// Function to process search results
async function processSearchResults(results: WebResult[] | string[]) {
  console.log(`\nProcessing ${results.length} search results...`);

  const allEmailsByUrl: Record<string, string[]> = {};
  const allEmailContexts: EmailContext[] = [];
  const enhancedResults = [];

  for (const result of results) {
    try {
      const url = typeof result === "string" ? result : result.url;
      const title = typeof result === "string" ? url : result.title;
      const description = typeof result === "string" ? "" : result.description;

      console.log(`Fetching content from: ${url}`);
      const content = await getPageContent(url, null);
      const domain = new URL(url).hostname;

      const enhanced = {
        url,
        title,
        description,
        metaUrl: typeof result === "string" ? null : result.metaUrl,
        content,
        source_domain: domain,
        originalResult: typeof result === "string" ? null : result,
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
      const errorUrl = typeof result === "string" ? result : result.url;
      console.error(`Error processing ${errorUrl}:`, error);
    }
  }

  // Save detailed results to files
  fs.writeFileSync(
    path.join(RESULTS_DIR, `search-results.json`),
    JSON.stringify(enhancedResults, null, 2)
  );

  fs.writeFileSync(
    path.join(RESULTS_DIR, `emails.json`),
    JSON.stringify(allEmailsByUrl, null, 2)
  );

  fs.writeFileSync(
    path.join(RESULTS_DIR, `email-contexts.json`),
    JSON.stringify(allEmailContexts, null, 2)
  );

  // Print summary
  const totalEmails = Object.values(allEmailsByUrl).reduce(
    (sum, emails) => sum + emails.length,
    0
  );
  const uniqueEmails = new Set<string>();
  Object.values(allEmailsByUrl).forEach((emails) => {
    emails.forEach((email) => uniqueEmails.add(email));
  });

  console.log(`\nSearch Summary:`);
  console.log(`- Total URLs processed: ${enhancedResults.length}`);
  console.log(`- URLs with emails: ${Object.keys(allEmailsByUrl).length}`);
  console.log(`- Total emails found: ${totalEmails}`);
  console.log(`- Unique emails found: ${uniqueEmails.size}`);

  console.log("\n=== All Unique Emails ===");
  Array.from(uniqueEmails).forEach((email) => console.log(email));

  // Find most relevant email using OpenAI
  const mostRelevantEmail = await evaluateMostRelevantEmail(allEmailContexts);

  if (mostRelevantEmail) {
    fs.writeFileSync(
      path.join(RESULTS_DIR, "most-relevant-email.txt"),
      mostRelevantEmail
    );
  }

  return {
    enhancedResults,
    allEmailsByUrl,
    allEmailContexts,
    uniqueEmails: Array.from(uniqueEmails),
    mostRelevantEmail,
  };
}

async function main() {
  console.log(`Starting search for: "${SEARCH_QUERY}"`);

  try {
    // Web search
    const results = await getSearchResults(SEARCH_QUERY, {
      searchType: "web",
      count: 10,
    });

    // If we didn't get any results, terminate
    if (results.length === 0) {
      console.error("Error: No results returned from API search");
      process.exit(1);
    }

    const { uniqueEmails, mostRelevantEmail } =
      await processSearchResults(results);

    // Save final results
    fs.writeFileSync(
      path.join(RESULTS_DIR, "all-emails.json"),
      JSON.stringify(uniqueEmails, null, 2)
    );

    console.log(`\nSearch complete. Results saved to ${RESULTS_DIR}`);
    if (mostRelevantEmail) {
      console.log(
        `Most relevant email for public records requests: ${mostRelevantEmail}`
      );
    }
  } catch (error) {
    console.error("Error running search:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
