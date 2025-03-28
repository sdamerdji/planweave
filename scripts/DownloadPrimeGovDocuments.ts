import { db } from "@/src/db";
import {
  eventAgendaText,
  eventMinutesText,
  primeGovDocumentText,
  rawEvent,
  rawPrimeGovMeeting,
} from "@/src/db/schema";
import { downloadAndParsePdf } from "@/src/DownloadAndParsePdf";
import { program } from "commander";
import { eq, and, isNull, or, gt } from "drizzle-orm";
import _ from "lodash";

const NUM_COROUTINES = 10;
const BATCH_SIZE = 1000;

program.parse(process.argv);
const options = program.opts();

const main = async () => {
  let lastProcessedId = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching batch of meetings after ID ${lastProcessedId}...`);

    const meetings = await db
      .select()
      .from(rawPrimeGovMeeting)
      .where(gt(rawPrimeGovMeeting.id, lastProcessedId))
      .orderBy(rawPrimeGovMeeting.id)
      .limit(BATCH_SIZE);

    if (meetings.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing ${meetings.length} meetings...`);
    lastProcessedId = meetings[meetings.length - 1].id;

    const downloadAndParsePdfCoroutine = async (coroNum: number) => {
      while (meetings.length > 0) {
        try {
          const meeting = meetings.pop();
          if (!meeting) {
            break;
          }

          console.log(
            `[downloadAndParsePdfCoroutine ${coroNum}] Processing event ${meeting.primeGovMeetingId}`
          );

          const rawMeetingJson = meeting.json as any;

          for (const document of rawMeetingJson["documentList"]) {
            const url = `https://${meeting.primeGovClient}.primegov.com/Public/CompiledDocument?meetingTemplateId=${document["templateId"]}&compileOutputType=1`;
            const pdfText = await downloadAndParsePdf(url, 1024 * 1024 * 2);
            if (pdfText) {
              await db
                .insert(primeGovDocumentText)
                .values({
                  primeGovClient: meeting.primeGovClient,
                  primeGovMeetingId: meeting.primeGovMeetingId,
                  primeGovDocumentId: document["id"],
                  primeGovTemplateName: document["templateName"],
                  text: pdfText,
                  documentUrl: url,
                })
                .onConflictDoUpdate({
                  target: [
                    primeGovDocumentText.primeGovClient,
                    primeGovDocumentText.primeGovDocumentId,
                  ],
                  set: {
                    text: pdfText,
                    documentUrl: url,
                  },
                });
            } else {
              console.error(
                `[downloadAndParsePdfCoroutine ${coroNum}] Error downloading document ${document["id"]} for event ${meeting.primeGovMeetingId}`
              );
            }
          }
        } catch (e) {
          console.error(
            `[downloadAndParsePdfCoroutine ${coroNum}] Error: ${e}`
          );
        }
      }

      console.log(`[downloadAndParsePdfCoroutine ${coroNum}] Done`);
    };

    await Promise.all(
      _.range(NUM_COROUTINES).map((i) => downloadAndParsePdfCoroutine(i))
    );
  }

  console.log("All meetings processed! 🤠");
};

main().catch(console.error);
