import * as cheerio from "cheerio";
import { config } from "dotenv";
import { OpenAI } from "openai";
import { setTimeout } from "timers/promises";
import chalk from "chalk";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { createObjectCsvWriter } from "csv-writer";

const BayAreaCities = [
  { name: "Alameda", state: "California" },
  { name: "Albany", state: "California" },
  { name: "American Canyon", state: "California" },
  { name: "Antioch", state: "California" },
  { name: "Atherton", state: "California" },
  { name: "Belmont", state: "California" },
  { name: "Belvedere", state: "California" },
  { name: "Benicia", state: "California" },
  { name: "Berkeley", state: "California" },
  { name: "Brentwood", state: "California" },
  { name: "Brisbane", state: "California" },
  { name: "Burlingame", state: "California" },
  { name: "Calistoga", state: "California" },
  { name: "Campbell", state: "California" },
  { name: "Cloverdale", state: "California" },
  { name: "Colma", state: "California" },
  { name: "Concord", state: "California" },
  { name: "Corte Madera", state: "California" },
  { name: "Cotati", state: "California" },
  { name: "Cupertino", state: "California" },
  { name: "Daly City", state: "California" },
  { name: "Danville", state: "California" },
  { name: "Dixon", state: "California" },
  { name: "Dublin", state: "California" },
  { name: "East Palo Alto", state: "California" },
  { name: "El Cerrito", state: "California" },
  { name: "Emeryville", state: "California" },
  { name: "Fairfax", state: "California" },
  { name: "Fairfield", state: "California" },
  { name: "Foster City", state: "California" },
  { name: "Fremont", state: "California" },
  { name: "Gilroy", state: "California" },
  { name: "Half Moon Bay", state: "California" },
  { name: "Hayward", state: "California" },
  { name: "Healdsburg", state: "California" },
  { name: "Hercules", state: "California" },
  { name: "Hillsborough", state: "California" },
  { name: "Lafayette", state: "California" },
  { name: "Larkspur", state: "California" },
  { name: "Livermore", state: "California" },
  { name: "Los Gatos", state: "California" },
  { name: "Martinez", state: "California" },
  { name: "Menlo Park", state: "California" },
  { name: "Mill Valley", state: "California" },
  { name: "Millbrae", state: "California" },
  { name: "Milpitas", state: "California" },
  { name: "Moraga", state: "California" },
  { name: "Morgan Hill", state: "California" },
  { name: "Mountain View", state: "California" },
  { name: "Napa", state: "California" },
  { name: "Novato", state: "California" },
  { name: "Oakland", state: "California" },
  { name: "Orinda", state: "California" },
  { name: "Pacifica", state: "California" },
  { name: "Palo Alto", state: "California" },
  { name: "Petaluma", state: "California" },
  { name: "Piedmont", state: "California" },
  { name: "Pinole", state: "California" },
  { name: "Pittsburg", state: "California" },
  { name: "Pleasant Hill", state: "California" },
  { name: "Pleasanton", state: "California" },
  { name: "Redwood City", state: "California" },
  { name: "Richmond", state: "California" },
  { name: "Rio Vista", state: "California" },
  { name: "Rohnert Park", state: "California" },
  { name: "San Anselmo", state: "California" },
  { name: "San Bruno", state: "California" },
  { name: "San Carlos", state: "California" },
  { name: "San Francisco", state: "California" },
  { name: "San Jose", state: "California" },
  { name: "San Leandro", state: "California" },
  { name: "San Mateo", state: "California" },
  { name: "San Rafael", state: "California" },
  { name: "San Ramon", state: "California" },
  { name: "Santa Clara", state: "California" },
  { name: "Santa Rosa", state: "California" },
  { name: "Saratoga", state: "California" },
  { name: "Sausalito", state: "California" },
  { name: "Sebastopol", state: "California" },
  { name: "Sonoma", state: "California" },
  { name: "South San Francisco", state: "California" },
  { name: "St. Helena", state: "California" },
  { name: "Sunnyvale", state: "California" },
  { name: "Tiburon", state: "California" },
  { name: "Union City", state: "California" },
  { name: "Vallejo", state: "California" },
  { name: "Walnut Creek", state: "California" },
  { name: "Windsor", state: "California" },
  { name: "Woodside", state: "California" },
];

// Load environment variables
config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Brave API key
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

// Result type
interface PermitPortalResult {
  city: string;
  state: string;
  permitPlatformUrl: string | null;
  softwareProvider: string | null;
  notes: string;
}

// Define console formatting helpers
const log = {
  info: (message: string) => console.log(chalk.cyan(message)),
  success: (message: string) => console.log(chalk.green(message)),
  warning: (message: string) => console.log(chalk.yellow(message)),
  error: (message: string) =>
    console.error(chalk.red.bold(`ERROR: ${message}`)),
  title: (message: string) => console.log(chalk.magenta.bold(`\n${message}`)),
  subtitle: (message: string) => console.log(chalk.blue.bold(`\n${message}`)),
  result: (label: string, value: string) =>
    console.log(`  ${chalk.cyan(label)}: ${value}`),
  stat: (label: string, value: string) =>
    console.log(`  ${chalk.yellow(label)}: ${chalk.bold(value)}`),
};

/**
 * Check if URL is on a different domain or subdomain from the city website
 */
function isValidPlatformDomain(platformUrl: string, cityName: string): boolean {
  try {
    const url = new URL(platformUrl);
    const domain = url.hostname.toLowerCase();

    // Convert city name to potential domain format (remove spaces, lowercase)
    const cityDomainPart = cityName.toLowerCase().replace(/\s+/g, "");

    // Check if it's a city website (common city website patterns)
    const commonCityDomains = [
      `${cityDomainPart}.gov`,
      `${cityDomainPart}.org`,
      `${cityDomainPart}.us`,
      `${cityDomainPart}ca.gov`,
      `${cityDomainPart}ca.us`,
      `cityof${cityDomainPart}.gov`,
      `cityof${cityDomainPart}.org`,
      `cityof${cityDomainPart}.us`,
      `cityof${cityDomainPart}.com`,
      `${cityDomainPart}city.gov`,
      `${cityDomainPart}city.org`,
      `${cityDomainPart}city.us`,
      `${cityDomainPart}city.com`,
    ];

    // Check if the domain exactly matches any common city domain
    for (const cityDomain of commonCityDomains) {
      if (domain === cityDomain) {
        // If exact match, require it to be on a different subdomain
        // Example: permits.berkeley.gov is different from berkeley.gov
        const parts = domain.split(".");
        if (parts.length > 2 && parts[0] !== "www") {
          return true; // Different subdomain is acceptable
        }
        return false; // Same domain, not acceptable
      }
    }

    // Check if domain contains city name but isn't an exact match from above
    // This is likely a third-party domain, which is valid
    return true;
  } catch (error) {
    console.error(`Error validating domain: ${error}`);
    return false; // Invalid URL format
  }
}

/**
 * Search Brave for city permit platform
 */
async function searchBrave(query: string): Promise<any> {
  try {
    const response = await fetch(
      `${BRAVE_SEARCH_URL}?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": BRAVE_API_KEY || "",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Brave search API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching Brave:", error);
    return null;
  }
}

/**
 * Use ChatGPT to analyze search results for permit platform links
 */
async function analyzeBraveResults(
  cityName: string,
  results: any
): Promise<{
  found: boolean;
  url: string | null;
  provider: string | null;
  notes: string;
  linksToCheck?: string[];
}> {
  if (!results || !results.web || !results.web.results) {
    return {
      found: false,
      url: null,
      provider: null,
      notes: "No search results found",
    };
  }

  const webResults = results.web.results.slice(0, 10); // Take only top 10 results
  const resultDescriptions = webResults
    .map(
      (result: any, index: number) =>
        `${index + 1}. Title: ${result.title}\nURL: ${result.url}\nDescription: ${result.description}`
    )
    .join("\n\n");

  const prompt = `
You are analyzing search results for the city of ${cityName}'s online permit application platform or system.

Search Results:
${resultDescriptions}

FIRST TASK: Determine if any of these search results directly point to an online permit application platform. 
An online permit application platform is a website where users can apply for, check status of, or pay for building permits online.

examples of platform URLs:
https://portal.laserfiche.com/f0791/forms/1UEiz
https://aca-prod.accela.com/ALAMEDA/Default.aspx

non-examples of platform URLs:
https://www.americancanyon.gov/Work/City-Fees/Permit-Portal
https://www.albanyca.gov/Departments/Community-Development/Building/Building-Permits

SECOND TASK: If a permit platform is found, identify the software provider, if possible.
This might be visible in the URL (e.g., accela.com, tylertech.com), mentioned in the description,
or inferrable from the domain structure.

Common software providers include:
- Accela
- Tyler Technologies
- OpenGov
- Citizenserve
- Granicus
- CityView
- MyGov
- CentralSquare (eTRAKiT)
- etc.

IMPORTANT RULE: A valid permit platform must be on a different domain from the city's main website, 
or at least on a different subdomain. For example, if the city's website is cityofberkeley.org, 
then permits.cityofberkeley.org would be valid, but cityofberkeley.org/permits would NOT be valid.

Respond in this exact format:
FOUND_PLATFORM: [yes/no]
PLATFORM_URL: [url or "none"]
SOFTWARE_PROVIDER: [provider name or "unknown"]
NOTES: [brief explanation of your findings and confidence level]
TOP_LINKS_TO_CHECK: [If no direct platform found, list up to 3 numbered URLs that should be checked]
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      temperature: 0,
    });

    const response = completion.choices[0].message.content || "";

    // Parse the response
    const foundPlatform = /FOUND_PLATFORM:\s*yes/i.test(response);
    const platformUrlMatch = response.match(/PLATFORM_URL:\s*([^\s\n]+)/i);
    const providerMatch = response.match(/SOFTWARE_PROVIDER:\s*([^\n]+)/i);
    const notesMatch = response.match(/NOTES:\s*([^\n]+(?:\n[^\n]+)*)/i);
    const topLinksMatch = response.match(
      /TOP_LINKS_TO_CHECK:\s*([^\n]+(?:\n[^\n]+)*)/i
    );

    let url =
      foundPlatform && platformUrlMatch ? platformUrlMatch[1].trim() : null;
    const provider = providerMatch ? providerMatch[1].trim() : null;
    const notes = notesMatch ? notesMatch[1].trim() : "No notes provided";

    // Validate the domain if a URL is found
    if (url && url !== "none") {
      if (!isValidPlatformDomain(url, cityName)) {
        return {
          found: false,
          url: null,
          provider,
          notes: `Found URL (${url}) is on the city website domain. Not a valid platform. ${notes}`,
        };
      }
    }

    // Extract links to check if no platform found
    let linksToCheck: string[] = [];
    if (!foundPlatform && topLinksMatch) {
      const linksSection = topLinksMatch[1];
      const linkMatches = linksSection.matchAll(
        /\d+\.\s*(?:URL:)?\s*(https?:\/\/[^\s\n]+)/gi
      );
      linksToCheck = Array.from(linkMatches, (match) => match[1]);
    }

    return {
      found: foundPlatform,
      url: url === "none" ? null : url,
      provider: provider === "unknown" ? null : provider,
      notes,
      linksToCheck,
    };
  } catch (error) {
    console.error("Error analyzing with ChatGPT:", error);
    return {
      found: false,
      url: null,
      provider: null,
      notes: "Error analyzing with ChatGPT",
    };
  }
}

/**
 * Fetch a webpage and extract its content
 */
async function fetchWebpage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    return html;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Use ChatGPT to analyze a webpage for permit platform links
 */
async function analyzeWebpage(
  cityName: string,
  url: string,
  html: string
): Promise<{
  found: boolean;
  platformUrl: string | null;
  provider: string | null;
  notes: string;
}> {
  if (!html) {
    return {
      found: false,
      platformUrl: null,
      provider: null,
      notes: `Failed to fetch ${url}`,
    };
  }

  // Use cheerio to extract all <a> tags from the HTML
  const $ = cheerio.load(html);
  const links: { url: string; text: string }[] = [];

  $("a").each((i: number, element: any) => {
    const url = $(element).attr("href");
    const text = $(element).text().trim();

    if (url && !url.startsWith("javascript:") && !url.startsWith("#")) {
      // Resolve relative URLs to absolute
      let absoluteUrl = url;
      if (!url.startsWith("http")) {
        try {
          absoluteUrl = new URL(url, new URL(url).origin).href;
        } catch {
          try {
            const baseUrl = new URL(url);
            absoluteUrl = new URL(url, `http://${baseUrl.hostname}`).href;
          } catch {
            // If all else fails, just use the original URL
            absoluteUrl = url;
          }
        }
      }

      links.push({ url: absoluteUrl, text });
    }
  });

  // Format links for the prompt
  const linksFormatted = links
    .map(
      (link, index) => `${index + 1}. [${link.text || "No text"}](${link.url})`
    )
    .join("\n");

  const prompt = `
You are analyzing a webpage from the city of ${cityName}'s website to find links to their online permit application platform.

Webpage URL: ${url}
Links to check:
${linksFormatted}

TASK: Find any links or references to an online permit application platform or online permitting system.
Look for keywords like "building permits", "permit applications", "online permits", "ePermits", etc.

Also identify the software provider if possible. Common providers include:
- Accela
- Tyler Technologies
- OpenGov
- Citizenserve
- Granicus
- CityView
- MyGov
- CentralSquare (eTRAKiT)
- etc.

EXAMPLES OF PLATFORM URLS:
https://portal.laserfiche.com/f0791/forms/1UEiz
https://aca-prod.accela.com/ALAMEDA/Default.aspx

NON-EXAMPLES OF PLATFORM URLS:
https://www.americancanyon.gov/Work/City-Fees/Permit-Portal
https://www.albanyca.gov/Departments/Community-Development/Building/Building-Permits

IMPORTANT RULE: A valid permit platform must be on a different domain from the city's main website, 
or at least on a different subdomain. For example, if the city's website is cityofberkeley.org, 
then permits.cityofberkeley.org would be valid, but cityofberkeley.org/permits would NOT be valid.

Respond in this exact format:
FOUND_PLATFORM: [yes/no]
PLATFORM_URL: [url or "none"]
SOFTWARE_PROVIDER: [provider name or "unknown"]
NOTES: [brief explanation of your findings]
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      temperature: 0,
    });

    const response = completion.choices[0].message.content || "";

    // Parse the response
    const foundPlatform = /FOUND_PLATFORM:\s*yes/i.test(response);
    const platformUrlMatch = response.match(/PLATFORM_URL:\s*([^\s\n]+)/i);
    const providerMatch = response.match(/SOFTWARE_PROVIDER:\s*([^\n]+)/i);
    const notesMatch = response.match(/NOTES:\s*([^\n]+(?:\n[^\n]+)*)/i);

    let platformUrl =
      foundPlatform && platformUrlMatch ? platformUrlMatch[1].trim() : null;
    const provider = providerMatch ? providerMatch[1].trim() : null;
    const notes = notesMatch ? notesMatch[1].trim() : "No notes provided";

    // Validate the domain if a URL is found
    if (platformUrl && platformUrl !== "none") {
      if (!isValidPlatformDomain(platformUrl, cityName)) {
        return {
          found: false,
          platformUrl: null,
          provider,
          notes: `Found URL (${platformUrl}) is on the city website domain. Not a valid platform. ${notes}`,
        };
      }
    }

    return {
      found: foundPlatform,
      platformUrl: platformUrl === "none" ? null : platformUrl,
      provider: provider === "unknown" ? null : provider,
      notes,
    };
  } catch (error) {
    console.error("Error analyzing webpage with ChatGPT:", error);
    return {
      found: false,
      platformUrl: null,
      provider: null,
      notes: "Error analyzing with ChatGPT",
    };
  }
}

/**
 * Main function to find permit platform for a city
 */
async function findPermitPlatform(city: {
  name: string;
  state: string;
}): Promise<PermitPortalResult> {
  log.info(`Processing ${chalk.bold(city.name)}, ${city.state}...`);

  // Step 1: Search using Brave
  const searchQuery = `${city.name} ${city.state} online permit application platform building`;
  const searchResults = await searchBrave(searchQuery);

  // Step 2: Analyze search results with ChatGPT
  const analysis = await analyzeBraveResults(city.name, searchResults);

  // If a permit platform was found directly from search results
  if (analysis.found && analysis.url) {
    return {
      city: city.name,
      state: city.state,
      permitPlatformUrl: analysis.url,
      softwareProvider: analysis.provider,
      notes: analysis.notes,
    };
  }

  // Check top links from search results if no direct platform found
  if (analysis.linksToCheck && analysis.linksToCheck.length > 0) {
    // Check each promising link from search results
    for (const link of analysis.linksToCheck.slice(0, 3)) {
      // Check up to 3 links
      log.info(
        `  Checking link: ${chalk.underline(link)} for ${chalk.bold(city.name)}`
      );

      // Fetch and analyze the webpage
      const html = await fetchWebpage(link);
      if (!html) {
        log.warning(`  Failed to fetch ${link}`);
        continue;
      }

      const pageAnalysis = await analyzeWebpage(city.name, link, html);

      // If found a platform, return it
      if (pageAnalysis.found && pageAnalysis.platformUrl) {
        return {
          city: city.name,
          state: city.state,
          permitPlatformUrl: pageAnalysis.platformUrl,
          softwareProvider: pageAnalysis.provider,
          notes: `Found via link from search results. ${pageAnalysis.notes}`,
        };
      }

      // Add a small delay between requests
      await setTimeout(1000);
    }
  }

  // If no permit platform found after checking links
  return {
    city: city.name,
    state: city.state,
    permitPlatformUrl: null,
    softwareProvider: null,
    notes: `No online permit application platform found. ${analysis.notes}`,
  };
}

/**
 * Write results to a CSV file
 */
async function writeResultsToCsv(
  results: PermitPortalResult[],
  filePath: string
): Promise<void> {
  try {
    // Ensure the directory exists
    await mkdir(dirname(filePath), { recursive: true });

    // Configure the CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "city", title: "City" },
        { id: "state", title: "State" },
        { id: "permitPlatformUrl", title: "Permit Platform URL" },
        { id: "softwareProvider", title: "Software Provider" },
        { id: "notes", title: "Notes" },
      ],
    });

    // Write records to CSV
    await csvWriter.writeRecords(
      results.map((result) => ({
        city: result.city,
        state: result.state,
        permitPlatformUrl: result.permitPlatformUrl || "",
        softwareProvider: result.softwareProvider || "",
        notes: result.notes,
      }))
    );

    log.success(`Results saved to ${chalk.underline(filePath)}`);
  } catch (error) {
    log.error(`Failed to write CSV file: ${error}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    log.error("OPENAI_API_KEY environment variable not set");
    process.exit(1);
  }

  if (!process.env.BRAVE_API_KEY) {
    log.error("BRAVE_API_KEY environment variable not set");
    process.exit(1);
  }

  log.title(
    `Starting online permit application platform search for ${chalk.bold(BayAreaCities.length.toString())} Bay Area cities...`
  );

  const results: PermitPortalResult[] = [];

  for (const city of BayAreaCities) {
    try {
      const result = await findPermitPlatform(city);
      results.push(result);
      if (result.permitPlatformUrl) {
        log.success(
          `Result for ${chalk.bold(city.name)}: ${chalk.underline(result.permitPlatformUrl)}`
        );
      } else {
        log.warning(`Result for ${chalk.bold(city.name)}: No platform found`);
      }

      // Add a delay to avoid rate limits
      await setTimeout(2000);
    } catch (error) {
      log.error(`Error processing ${city.name}: ${error}`);
      results.push({
        city: city.name,
        state: city.state,
        permitPlatformUrl: null,
        softwareProvider: null,
        notes: `Error: ${error}`,
      });
    }
  }

  // Write results to CSV file
  await writeResultsToCsv(results, "data/city_permit_portals.csv");

  // Print summary of results
  log.title("ONLINE PERMIT APPLICATION PLATFORM SEARCH RESULTS");
  results.forEach((result) => {
    log.subtitle(`${result.city}, ${result.state}`);
    log.result(
      "Platform URL",
      result.permitPlatformUrl || chalk.italic("Not found")
    );
    log.result(
      "Software Provider",
      result.softwareProvider || chalk.italic("Unknown")
    );
    log.result("Notes", result.notes);
  });

  // Print statistics
  const foundCount = results.filter((r) => r.permitPlatformUrl !== null).length;
  const percentage = Math.round((foundCount / results.length) * 100);

  log.title("Summary");
  log.stat(
    "Found online permit application platforms for",
    `${foundCount} out of ${results.length} cities (${percentage}%)`
  );

  // Group by software provider
  const providerCounts = results.reduce(
    (acc: { [key: string]: number }, result) => {
      const provider = result.softwareProvider || "Unknown";
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    },
    {}
  );

  log.subtitle("Software Provider Distribution");
  Object.entries(providerCounts).forEach(([provider, count]) => {
    const providerPercentage = Math.round((count / results.length) * 100);
    log.stat(provider, `${count} cities (${providerPercentage}%)`);
  });
}

// Run the main function
main().catch((error) => {
  log.error(`Unhandled error: ${error}`);
  process.exit(1);
});
