import { rawEvent } from "@/src/db/schema";
import { program } from "commander";
import { db } from "@/src/db";

program.option("-c, --client <client>").option("-t, --table <table>");

program.parse(process.argv);
const options = program.opts();

const downloadRawEvent = async () => {
  const pageSize = 200;
  let skip = 0;

  while (true) {
    console.log(`Downloading raw_event skip=${skip}`);
    const url = `https://webapi.legistar.com/v1/${options.client}/events?$skip=${skip}&$top=${pageSize}`;
    const response = await fetch(url);
    const data: any[] = await response.json();

    if (data.length === 0) {
      console.log("No more events to download");
      break;
    }

    await db
      .insert(rawEvent)
      .values(
        data.map((event) => ({
          legistarClient: options.client,
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

    skip += pageSize;
  }
};

const main = async () => {
  console.log(`Downloading ${options.table} for ${options.client}`);

  if (options.table === "raw_event") {
    await downloadRawEvent();
  }
};

main().catch(console.error);
