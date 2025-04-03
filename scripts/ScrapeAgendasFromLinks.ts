import _ from "lodash";
import agendaPageLinks from "../src/agendaPageLinks";
import * as cheerio from "cheerio";
import { downloadAndParsePdf } from "../src/DownloadAndParsePdf";
import { db } from "@/src/db";
import { scrapedAgendaText } from "@/src/db/schema";
import { DateTime } from "luxon";

const COROUTINE_COUNT = 20;
const VERBOSE = false;

const findAgendaUrlsWithChatGPT = async (
  html: string,
  agendaPageUrl: string
): Promise<string[]> => {
  // Use ChatGPT to identify potential agenda links from the HTML content

  try {
    // First, parse the HTML with cheerio to extract all links
    const $ = cheerio.load(html);
    const allLinks: { url: string; text: string }[] = [];

    // Extract all links with their text
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();

      if (href && text) {
        // Resolve relative URLs to absolute
        let fullUrl = href;
        if (href.startsWith("/")) {
          try {
            const baseUrl = new URL(agendaPageUrl);
            fullUrl = `${baseUrl.origin}${href}`;
          } catch (e) {
            // If URL parsing fails, keep the original href
          }
        }

        allLinks.push({
          url: fullUrl,
          text: text,
        });
      }
    });

    // Prepare a simplified version of the links for the API call
    const simplifiedLinks = allLinks
      .map((link) => `URL: ${link.url}, Text: ${link.text}`)
      .join("\n");
    // .slice(0, 8000); // Limit size for API call

    if (VERBOSE) {
      console.log(simplifiedLinks);
    }

    // Call ChatGPT API to identify agenda links
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are a helpful assistant that identifies links to city council or committee meeting agendas.

You will be given a list of links to a webpage.

Your job is to analyze these links and identify which ones are likely to be agenda documents or pages containing agenda documents.

Here are some examples of agenda links:
https://piedmont.ca.gov/UserFiles/Servers/Server_13659739/File/Government/City%20Council/Agenda/City%20Council%20Agenda%202025-03-21%20(Special).pdf, Text: Special City Council Meeting - March 21, 2025

Here are some examples of non-agenda links:
URL: http://piedmont.hosted.civiclive.com/cms/One.aspx?portalId=13659823&pageId=14120431, Text: Meeting Information & Agendas
            `,
          },
          {
            role: "user",
            content: `I'm looking for links to city council or committee meeting agendas on a webpage. Please analyze these links and identify which ones are likely to be agenda documents or pages containing agenda documents. Return only the URLs of likely agenda links, one per line, and nothing else. Here are the links:\n\n${simplifiedLinks}`,
          },
        ],
        // temperature: 0.3,
      }),
    });

    const data = await response.json();
    if (VERBOSE) {
      console.log(data.choices[0].message.content);
    }
    const agendaLinks = data.choices[0].message.content
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line !== "");

    console.log(`Found ${agendaLinks.length} potential agenda links`);
    return agendaLinks;
  } catch (error) {
    console.error("Error in findAgendaLinksWithChatGPT:", error);
    return [];
  }
};

const parseTimestamp = (timestamp: string | null): Date | null => {
  if (!timestamp) {
    return null;
  }

  const parsed = DateTime.fromISO(timestamp.replace(" ", "T"), {
    zone: "America/Los_Angeles",
  });

  if (parsed.invalidReason) {
    console.error("Invalid timestamp from ChatGPT");
    console.error(timestamp);
    return null;
  }

  const parsedJsDate = parsed.toJSDate();

  if (VERBOSE) {
    console.log(`${timestamp} -> ${parsedJsDate.toISOString()}`);
  }

  return parsedJsDate;
};

const extractDetailsFromAgendaTextWithChatGPT = async (
  agendaText: string
): Promise<{ meetingTimestamp: Date | null; body: string | null } | null> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a helpful assistant.
You will be given a text of a city council or committee meeting agenda.
Your job is to extract the details of the agenda.

Return your response in JSON format.

Here's an example of the expected output:
{
  "meetingTimestamp": "2025-03-21 19:00:00",
  "legislativeBody": "City Council"
}

If you cannot find the meeting timestamp, set it to null.
If you cannot find the body, set it to null.

ONLY return the JSON object itself, nothing else.

Finally, know that I'm really proud of you and I'm sure you'll do a great job :)
          `,
        },
        { role: "user", content: agendaText },
      ],
    }),
  });

  const data = await response.json();
  let result: {
    meetingTimestamp: string | null;
    legislativeBody: string | null;
  };
  try {
    result = JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Error parsing JSON from ChatGPT");
    console.error(data.choices[0].message.content);
    return null;
  }

  if (VERBOSE) {
    console.log(result);
  }

  if (_.isEqual(Object.keys(result), ["meetingTimestamp", "legislativeBody"])) {
    return {
      body: result.legislativeBody,
      meetingTimestamp: parseTimestamp(result.meetingTimestamp),
    };
  } else {
    console.error("Invalid response from ChatGPT");
    return null;
  }
};

const main = async () => {
  const workQueue = [...agendaPageLinks];

  const coroutineFn = async (coroutineId: number) => {
    console.log(`[${coroutineId}] Starting coroutine`);

    while (workQueue.length > 0) {
      try {
        const link = workQueue.shift()!;

        console.log(`[${coroutineId}] Fetching ${link.agendaPageUrl}`);
        let html = "";
        try {
          const response = await fetch(link.agendaPageUrl, {
            method: "GET",
          });
          html = await response.text();
          console.log(`[${coroutineId}] Fetched`);
        } catch (error) {
          console.error(
            `[${coroutineId}] Error fetching ${link.agendaPageUrl}`
          );
          console.error(error);
          continue;
        }

        console.log(
          `[${coroutineId}] Analyzing HTML with ChatGPT to find agenda links...`
        );

        const agendaUrls = await findAgendaUrlsWithChatGPT(
          html,
          link.agendaPageUrl
        );
        console.log(
          `[${coroutineId}] Found ${agendaUrls.length} potential agenda urls`
        );

        const agendaTextByUrl: Record<string, string | null> = {};
        for (const agendaUrl of agendaUrls) {
          const agendaText = await downloadAndParsePdf(agendaUrl);
          agendaTextByUrl[agendaUrl] = agendaText;
        }

        console.log(
          `[${coroutineId}] Found ${
            Object.values(agendaTextByUrl).filter(
              (agendaText) => agendaText !== null
            ).length
          } agenda texts`
        );

        const agendaDetailsByUrl: Record<
          string,
          { meetingTimestamp: Date | null; body: string | null } | null
        > = {};
        for (const agendaUrl of agendaUrls) {
          const agendaText = agendaTextByUrl[agendaUrl];
          if (agendaText) {
            const agendaDetails =
              await extractDetailsFromAgendaTextWithChatGPT(agendaText);
            agendaDetailsByUrl[agendaUrl] = agendaDetails;
          } else {
            agendaDetailsByUrl[agendaUrl] = null;
          }
        }

        const values = Object.keys(agendaTextByUrl)
          .filter((agendaUrl) => agendaTextByUrl[agendaUrl] !== null)
          .map((agendaUrl) => ({
            agendaUrl,
            text: agendaTextByUrl[agendaUrl]!,
            jurisdiction: link.jurisdiction,
            meetingTimestamp: agendaDetailsByUrl[agendaUrl]?.meetingTimestamp,
            body: agendaDetailsByUrl[agendaUrl]?.body,
          }));

        if (values.length > 0) {
          await db
            .insert(scrapedAgendaText)
            .values(values)
            .onConflictDoNothing();
        }
      } catch (error) {
        console.error(`[${coroutineId}] Error in coroutine`);
        console.error(error);
      }
    }

    console.log(`[${coroutineId}] Finished`);
  };

  const coroutines = _.range(COROUTINE_COUNT).map(coroutineFn);
  await Promise.all(coroutines);
};

main();
