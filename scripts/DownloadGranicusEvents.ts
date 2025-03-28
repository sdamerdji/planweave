import { db } from "@/src/db";
import { granicusEvent } from "@/src/db/schema";
import * as cheerio from "cheerio";
import { AllGranicusClients } from "@/src/constants";
import { program } from "commander";

program
  .option("-c, --client <client>", "Granicus client name (e.g. emeryville)")
  .option("--all-clients", "Download events for all Granicus clients");

program.parse(process.argv);
const options = program.opts();

async function downloadEventsForCity(city: string) {
  try {
    console.log(`Downloading events for ${city}...`);
    const response = await fetch(
      `https://${city}.granicus.com/ViewPublisher.php?view_id=5`
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch data for ${city}: ${response.status} ${response.statusText}`
      );
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const upcomingTableBody = $("table#upcoming tbody");
    if (upcomingTableBody.length !== 1) {
      console.error(
        `Found ${upcomingTableBody.length} upcoming tables for ${city}`
      );
    }

    const upcomingRows = upcomingTableBody.find("tr");

    const values = upcomingRows
      .toArray()
      .map((row) => {
        const [nameTd, dateTd, agendaTd] = $(row).find("td");
        const name = $(nameTd).text().trim();
        const dateContents = $(dateTd).contents().toArray();
        const date = $(dateContents[dateContents.length - 1])
          .text()
          .split("-")[0]
          .trim()
          // apparently these have non-breaking spaces which break's postgres' date parser
          .replace(/\u00A0/g, " ");
        const agendaUrl = "https:" + $(agendaTd).find("a").attr("href");

        // console.log($(dateTd).contents().toArray());
        console.log(date);

        // Parse the clip_id from the agenda URL
        let granicusId;
        if (agendaUrl) {
          // I don't really get why they don't have https: in the URL
          const url = new URL(agendaUrl);
          const eventIdParam = url.searchParams.get("event_id");
          if (eventIdParam) {
            granicusId = `event_id=${parseInt(eventIdParam, 10)}`;
          } else {
            console.error(`No event_id found in URL for ${city}:`, agendaUrl);
          }
        }

        return {
          granicusClient: city,
          granicusId: granicusId!,
          agendaUrl,
          name,
          date,
        };
      })
      .filter((row) => row.granicusId !== undefined);

    if (values.length > 0) {
      await db.insert(granicusEvent).values(values).onConflictDoNothing();
    }

    const archiveTableBodies = $("table#archive tbody");
    console.log(
      `Found ${archiveTableBodies.length} archive tables for ${city}`
    );

    for (const archiveTableBody of archiveTableBodies) {
      const rows = $(archiveTableBody).find("tr");

      const values = rows
        .toArray()
        .map((row) => {
          const [nameTd, dateTd, _, agendaTd] = $(row).find("td");

          const name = $(nameTd).text().trim();
          const date = $($(dateTd).contents()[1]).text().trim();
          const agendaUrl = "https:" + $(agendaTd).find("a").attr("href");

          // Parse the clip_id from the agenda URL
          let granicusId;
          if (agendaUrl) {
            // I don't really get why they don't have https: in the URL
            const url = new URL(agendaUrl);
            const clipIdParam = url.searchParams.get("clip_id");
            if (clipIdParam) {
              granicusId = `clip_id=${parseInt(clipIdParam, 10)}`;
            } else {
              console.error(`No clip_id found in URL for ${city}:`, agendaUrl);
            }
          }

          return {
            granicusClient: city,
            granicusId: granicusId!,
            agendaUrl,
            name,
            date,
          };
        })
        .filter((row) => row.granicusId !== undefined);

      if (values.length > 0) {
        await db.insert(granicusEvent).values(values).onConflictDoNothing();
      }
    }
    console.log(`Successfully processed events for ${city}`);
  } catch (error) {
    console.error(`Error processing ${city}:`, error);
  }
}

async function main() {
  if (!options.allClients && !options.client) {
    console.error(
      "Please provide a client name with -c or --client, or use --all-clients"
    );
    process.exit(1);
  }

  if (options.allClients) {
    console.log(
      `Starting to download events for ${AllGranicusClients.length} cities`
    );

    for (const city of AllGranicusClients) {
      await downloadEventsForCity(city);
    }
  } else {
    // If a specific city is provided, validate it exists
    if (!AllGranicusClients.includes(options.client)) {
      console.error(
        `Error: "${options.client}" is not a valid Granicus client.`
      );
      console.error("Valid clients are:", AllGranicusClients.join(", "));
      process.exit(1);
    }
    console.log(`Downloading events for specific client: ${options.client}`);
    await downloadEventsForCity(options.client);
  }

  console.log("Finished processing");
}

main().catch(console.error);
