import { db } from "@/src/db";
import { eventAgendaText, rawEvent } from "@/src/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const BATCH_SIZE = 100;

const main = async () => {
  console.log("Starting agenda URL backfill...");

  let totalProcessed = 0;

  while (true) {
    // Get batch of event_agenda_text entries that need agendaUrl backfilled
    const eventsNeedingBackfill = await db
      .select({
        event_agenda_text: eventAgendaText,
        raw_event: rawEvent,
      })
      .from(eventAgendaText)
      .innerJoin(
        rawEvent,
        and(
          eq(eventAgendaText.legistarClient, rawEvent.legistarClient),
          eq(eventAgendaText.legistarEventId, rawEvent.legistarEventId)
        )
      )
      .where(isNull(eventAgendaText.agendaUrl))
      .orderBy(eventAgendaText.legistarClient, eventAgendaText.legistarEventId)
      .limit(BATCH_SIZE);

    if (eventsNeedingBackfill.length === 0) {
      break;
    }

    console.log(
      `Processing batch of ${eventsNeedingBackfill.length} events (processed: ${totalProcessed})`
    );

    // Process each event in the batch
    for (const event of eventsNeedingBackfill) {
      const rawEventJson = event.raw_event.json as any;
      const agendaUrl = rawEventJson["EventAgendaFile"];

      if (agendaUrl) {
        await db
          .update(eventAgendaText)
          .set({ agendaUrl })
          .where(
            and(
              eq(
                eventAgendaText.legistarClient,
                event.event_agenda_text.legistarClient
              ),
              eq(
                eventAgendaText.legistarEventId,
                event.event_agenda_text.legistarEventId
              )
            )
          );
        console.log(
          `Updated agenda URL for event ${event.event_agenda_text.legistarEventId}`
        );
      } else {
        console.log(
          `No agenda URL found for event ${event.event_agenda_text.legistarEventId}`
        );
      }
    }

    totalProcessed += eventsNeedingBackfill.length;
  }

  console.log(
    `Finished agenda URL backfill. Total events processed: ${totalProcessed}`
  );
};

main().catch(console.error);
