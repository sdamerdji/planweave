// Node.js script to fetch Legistar matters and their attachments using fetch API

// For Node.js environments, we need to import fetch if using Node <18
// Uncomment the next line if using Node.js <18
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

import { matter } from "@/src/db/schema";
import { db } from "@/src/db";

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
  console.log(`Fetching Legistar data for client: ${client}`);

  // Base URL for the Legistar API
  const baseUrl = "https://webapi.legistar.com";

  // Function to fetch paginated matters
  async function fetchMatters() {
    const pageSize = 50;
    let skip = 0;
    let moreRecords = true;

    while (moreRecords) {
      const url = `${baseUrl}/v1/${client}/Matters?$top=${pageSize}&$skip=${skip}`;
      console.log(`Fetching matters from ${skip} to ${skip + pageSize}...`);

      try {
        const response = await fetch(url);
        const bodyText = await awaitStream(response);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const pageData: any[] = JSON.parse(bodyText);

        if (!pageData || pageData.length === 0) {
          moreRecords = false;
          console.log("No more matters to fetch.");
          break;
        }

        await db
          .insert(matter)
          .values(
            pageData.map((d) => ({
              legistarClient: client,
              matterId: d.MatterId,
              matterGuid: d.MatterGuid,
              matterFile: d.MatterFile,
              date: d.MatterAgendaDate,
              title: d.MatterTitle,
            }))
          )
          .onConflictDoNothing();

        // Move to next page
        skip += pageSize;

        // LOL claude wrote this comment:
        // Be nice to the API server
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Error fetching matters: ${error.message}`);
        moreRecords = false;
      }
    }
  }

  // Run the fetching process
  await fetchMatters();

  console.log("Data fetching completed!");
}

const clientName = "sunnyvaleca";
fetchLegistarData(clientName).catch(console.error);
