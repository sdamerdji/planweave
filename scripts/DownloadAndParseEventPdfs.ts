import { db } from "@/src/db";
import { eventAgendaText, eventMinutesText, rawEvent } from "@/src/db/schema";
import { downloadAndParsePdf } from "@/src/DownloadAndParsePdf";
import { program } from "commander";
import { eq, and, isNull, or } from "drizzle-orm";
import _ from "lodash";

const NUM_COROUTINES = 10;

program.option("-c, --client <client>");

program.parse(process.argv);
const options = program.opts();

const main = async () => {
  console.log("Querying missing texts...");
  const eventsMissingTexts = await db
    .select()
    .from(rawEvent)
    .leftJoin(
      eventAgendaText,
      and(
        eq(rawEvent.legistarEventId, eventAgendaText.legistarEventId),
        eq(rawEvent.legistarClient, eventAgendaText.legistarClient)
      )
    )
    .leftJoin(
      eventMinutesText,
      and(
        eq(rawEvent.legistarEventId, eventMinutesText.legistarEventId),
        eq(rawEvent.legistarClient, eventMinutesText.legistarClient)
      )
    )
    .where(or(isNull(eventAgendaText.id), isNull(eventMinutesText.id)));

  // const eventsWithNoMinutes = await db
  //   .select()
  //   .from(rawEvent)
  //   .leftJoin(
  //     eventMinutesText,
  //     and(
  //       eq(rawEvent.legistarEventId, eventMinutesText.legistarEventId),
  //       eq(rawEvent.legistarClient, eventMinutesText.legistarClient)
  //     )
  //   )
  //   .where(isNull(eventMinutesText.id));

  console.log(
    `Found ${eventsMissingTexts.length} events with missing agenda or minutes text`
  );

  const downloadAndParsePdfCoroutine = async (coroNum: number) => {
    while (eventsMissingTexts.length > 0) {
      const event = eventsMissingTexts.pop();
      if (!event) {
        break;
      }

      console.log(
        `[downloadAndParsePdfCoroutine ${coroNum}] Processing event ${event.raw_event.legistarEventId}`
      );

      // TODO: this is lazy; we should have a DBT step to transform json into a real schema
      const rawEventJson = event.raw_event.json as any;

      if (!event.event_agenda_text && rawEventJson["EventAgendaFile"]) {
        const pdfText = await downloadAndParsePdf(
          rawEventJson["EventAgendaFile"]
        );
        if (pdfText) {
          await db.insert(eventAgendaText).values({
            legistarClient: event.raw_event.legistarClient,
            legistarEventId: event.raw_event.legistarEventId,
            text: pdfText,
            agendaUrl: rawEventJson["EventAgendaFile"],
          });
        } else {
          console.error(
            `[downloadAndParsePdfCoroutine ${coroNum}] Error downloading agenda for event ${event.raw_event.legistarEventId}`
          );
        }
      }

      if (!event.event_minutes_text && rawEventJson["EventMinutesFile"]) {
        const pdfText = await downloadAndParsePdf(
          rawEventJson["EventMinutesFile"]
        );
        if (pdfText) {
          await db.insert(eventMinutesText).values({
            legistarClient: event.raw_event.legistarClient,
            legistarEventId: event.raw_event.legistarEventId,
            text: pdfText,
          });
        } else {
          console.error(
            `[downloadAndParsePdfCoroutine ${coroNum}] Error downloading minutes for event ${event.raw_event.legistarEventId}`
          );
        }
      }
    }

    console.log(`[downloadAndParsePdfCoroutine ${coroNum}] Done`);
  };

  await Promise.all(
    _.range(NUM_COROUTINES).map((i) => downloadAndParsePdfCoroutine(i))
  );
};

main().catch(console.error);
