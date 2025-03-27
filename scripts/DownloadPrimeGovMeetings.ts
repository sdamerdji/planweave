import { rawPrimeGovMeeting } from "@/src/db/schema";
import { program } from "commander";
import { db } from "@/src/db";
import { max, count, eq } from "drizzle-orm";
import _ from "lodash";
import { AllPrimeGovClients } from "@/src/constants";

program
  .option("-c, --client <client>", "PrimeGov client name (e.g. albanyca)")
  .option("--all-clients", "Download meetings for all PrimeGov clients")
  .option(
    "-y, --year <year>",
    "Year to download meetings for",
    new Date().getFullYear().toString()
  );

program.parse(process.argv);
const options = program.opts();

const downloadPrimeGovMeetingsForClient = async (
  client: string,
  year: number
) => {
  console.log(`Downloading PrimeGov meetings for ${client} in ${year}`);

  const url = `https://${client}.primegov.com/api/v2/PublicPortal/ListArchivedMeetings?year=${year}`;
  console.log(`Fetching from ${url}`);

  const response = await fetch(url);

  if (response.status >= 400) {
    console.error(`Failed to download meetings at ${url}`);
    console.error(`Status code: ${response.status}`);
    console.error(await response.text());
    return false;
  }

  const data: any[] = await response.json();

  if (data.length === 0) {
    console.log("No meetings found for this year");
    return false;
  }

  console.log(`Got ${data.length} meetings`);

  await db
    .insert(rawPrimeGovMeeting)
    .values(
      data.map((meeting) => ({
        primeGovClient: client,
        primeGovMeetingId: meeting.id,
        json: meeting,
      }))
    )
    .onConflictDoUpdate({
      target: [
        rawPrimeGovMeeting.primeGovClient,
        rawPrimeGovMeeting.primeGovMeetingId,
      ],
      set: {
        json: rawPrimeGovMeeting.json,
      },
    });

  return true;
};

const main = async () => {
  const client = options.client;
  const startYear = parseInt(options.year);

  if (!options.allClients && !client) {
    console.error(
      "Please provide a client name with -c or --client, or use --all-clients"
    );
    process.exit(1);
  }

  if (options.allClients) {
    for (const client of AllPrimeGovClients) {
      console.log(`\nProcessing client: ${client}`);
      let currentYear = startYear;
      while (true) {
        console.log(`\nTrying year ${currentYear}...`);
        const hasMeetings = await downloadPrimeGovMeetingsForClient(
          client,
          currentYear
        );

        if (!hasMeetings) {
          console.log(`No more meetings found before ${currentYear}`);
          break;
        }

        currentYear--;
      }
    }
  } else {
    let currentYear = startYear;
    while (true) {
      console.log(`\nTrying year ${currentYear}...`);
      const hasMeetings = await downloadPrimeGovMeetingsForClient(
        client!,
        currentYear
      );

      if (!hasMeetings) {
        console.log(`No more meetings found before ${currentYear}`);
        break;
      }

      currentYear--;
    }
  }
};

main().catch(console.error);
