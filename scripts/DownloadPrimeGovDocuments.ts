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
import { eq, and, isNull, or } from "drizzle-orm";
import _ from "lodash";

const NUM_COROUTINES = 10;

program.parse(process.argv);
const options = program.opts();

const main = async () => {
  console.log("Querying missing texts...");
  // TODO: this can be a ton of rows; we should paginate
  const meetingsMissingTexts = await db
    .select()
    .from(rawPrimeGovMeeting)
    .leftJoin(
      primeGovDocumentText,
      and(
        eq(
          rawPrimeGovMeeting.primeGovMeetingId,
          primeGovDocumentText.primeGovMeetingId
        ),
        eq(
          rawPrimeGovMeeting.primeGovClient,
          primeGovDocumentText.primeGovClient
        )
      )
    )
    .where(isNull(primeGovDocumentText.id));

  console.log(
    `Found ${meetingsMissingTexts.length} events with missing agenda or minutes text`
  );

  const downloadAndParsePdfCoroutine = async (coroNum: number) => {
    while (meetingsMissingTexts.length > 0) {
      try {
        const meeting = meetingsMissingTexts.pop();
        if (!meeting) {
          break;
        }

        console.log(
          `[downloadAndParsePdfCoroutine ${coroNum}] Processing event ${meeting.raw_prime_gov_meeting.primeGovMeetingId}`
        );

        // TODO: this is lazy; we should have a DBT step to transform json into a real schema
        const rawMeetingJson = meeting.raw_prime_gov_meeting.json as any;

        for (const document of rawMeetingJson["documentList"]) {
          const url = `https://${meeting.raw_prime_gov_meeting.primeGovClient}.primegov.com/Public/CompiledDocument?meetingTemplateId=${document["templateId"]}&compileOutputType=1`;
          const pdfText = await downloadAndParsePdf(url);
          if (pdfText) {
            await db.insert(primeGovDocumentText).values({
              primeGovClient: meeting.raw_prime_gov_meeting.primeGovClient,
              primeGovMeetingId:
                meeting.raw_prime_gov_meeting.primeGovMeetingId,
              primeGovDocumentId: document["id"],
              primeGovTemplateName: document["templateName"],
              text: pdfText,
            });
          } else {
            console.error(
              `[downloadAndParsePdfCoroutine ${coroNum}] Error downloading document ${document["id"]} for event ${meeting.raw_prime_gov_meeting.primeGovMeetingId}`
            );
          }
        }
      } catch (e) {
        console.error(`[downloadAndParsePdfCoroutine ${coroNum}] Error: ${e}`);
      }
    }

    console.log(`[downloadAndParsePdfCoroutine ${coroNum}] Done`);
  };

  await Promise.all(
    _.range(NUM_COROUTINES).map((i) => downloadAndParsePdfCoroutine(i))
  );
};

main().catch(console.error);
