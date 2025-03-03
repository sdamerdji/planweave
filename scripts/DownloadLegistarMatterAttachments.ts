// Node.js script to fetch Legistar matters and their attachments using fetch API

// For Node.js environments, we need to import fetch if using Node <18
// Uncomment the next line if using Node.js <18
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

import { XMLParser } from "fast-xml-parser";

import { eq, and } from "drizzle-orm";
import { matter, matterAttachment } from "@/src/db/schema";
import { db } from "@/src/db";
import _ from "lodash";

const parser = new XMLParser();

async function awaitStream(response: Response) {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("Failed to get response reader");
  }

  const decoder = new TextDecoder("utf-8");

  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    result += decoder.decode(value, { stream: true });
  }

  return result;
}

async function fetchLegistarData(client: string) {
  console.log(`Fetching matter attachments for client: ${client}`);

  // Base URL for the Legistar API
  const baseUrl = "https://webapi.legistar.com";

  const toFetchQueue = await db
    .select()
    .from(matter)
    .where(
      and(
        eq(matter.legistarClient, client),
        eq(matter.attachmentsFetched, false)
      )
    );

  console.log(`Matters to fetch: ${toFetchQueue.length}`);

  async function fetchAttachments(coroNumber: number) {
    while (toFetchQueue.length > 0) {
      const matterId = toFetchQueue.pop()!.matterId;

      console.log(
        `[fetchAttachments ${coroNumber}] Fetching for matter ${matterId}`
      );

      const url = `${baseUrl}/v1/${client}/Matters/${matterId}/Attachments`;

      let response;
      let bodyText;
      try {
        response = await fetch(url);
        bodyText = await awaitStream(response);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      } catch (e) {
        console.error(
          `[fetchAttachments ${coroNumber}] Error fetching attachments for matter ${matterId}:`,
          e
        );
        continue;
      }

      const pageData: any[] = JSON.parse(bodyText);

      console.log(
        `[fetchAttachments ${coroNumber}] Attachments for matter ${matterId}:`,
        pageData.length
      );
      if (pageData.length === 0) {
        continue;
      }

      await db
        .insert(matterAttachment)
        .values(
          pageData.map((d) => ({
            legistarClient: client,
            matterId: matterId,
            matterAttachmentId: d.MatterAttachmentId,
            matterAttachmentGuid: d.MatterAttachmentGuid,
            fileName: d.MatterAttachmentFileName,
            hyperlink: d.MatterAttachmentHyperlink,
          }))
        )
        .onConflictDoNothing();

      await db
        .update(matter)
        .set({ attachmentsFetched: true })
        .where(eq(matter.matterId, matterId));
    }
  }

  // Run the fetching process
  await Promise.all(_.range(10).map((i) => fetchAttachments(i)));

  console.log("Data fetching completed!");
}

const clientName = "sunnyvaleca";
fetchLegistarData(clientName).catch(console.error);
