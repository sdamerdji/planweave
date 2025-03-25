import { rawEvent } from "@/src/db/schema";
import { AllLegistarClients } from "@/src/constants";
import { program } from "commander";
import { db } from "@/src/db";
import { max, count, eq } from "drizzle-orm";
import _ from "lodash";

program
  .option("-c, --client <client>")
  .option("--all-clients")
  .option("-t, --table <table>");

program.parse(process.argv);
const options = program.opts();

const downloadRawEventsForClient = async (client: string) => {
  const pageSize = 200;

  const [{ eventCount, maxEventId }] = await db
    .select({ eventCount: count(), maxEventId: max(rawEvent.legistarEventId) })
    .from(rawEvent)
    .where(eq(rawEvent.legistarClient, client))
    .execute();

  let nextEventId = maxEventId ? maxEventId + 1 : 0;
  console.log(
    `Existing events: ${eventCount}\nStarting at event id: ${nextEventId}`
  );

  while (true) {
    console.log(`Downloading raw_event, nextEventId: ${nextEventId}`);
    const url = `https://webapi.legistar.com/v1/${client}/events?$top=${pageSize}&$filter=EventId+ge+${nextEventId}`;
    const response = await fetch(url);

    if (response.status >= 400) {
      console.error(`Failed to download events at ${url}`);
      console.error(`Status code: ${response.status}`);
      console.error(await response.text());
      break;
    }

    const data: any[] = await response.json();

    if (data.length === 0) {
      console.log("No more events to download");
      break;
    }
    console.log(`Got ${data.length} events`);

    await db
      .insert(rawEvent)
      .values(
        data.map((event) => ({
          legistarClient: client,
          legistarEventId: event.EventId,
          json: event,
        }))
      )
      .onConflictDoUpdate({
        target: [rawEvent.legistarClient, rawEvent.legistarEventId],
        set: {
          json: rawEvent.json,
        },
      });

    nextEventId = _.max(data.map((event) => event.EventId)) + 1;
  }
};

const main = async () => {
  if (options.allClients) {
    for (const client of AllLegistarClients) {
      console.log(`Downloading ${options.table} for ${client}`);
      await downloadRawEventsForClient(client);
    }
  } else {
    console.log(`Downloading ${options.table} for ${options.client}`);

    if (options.table === "raw_event") {
      await downloadRawEventsForClient(options.client);
    }
  }
};

main().catch(console.error);
