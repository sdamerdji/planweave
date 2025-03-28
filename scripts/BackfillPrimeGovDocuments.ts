import { db } from "@/src/db";
import { primeGovDocumentText, rawPrimeGovMeeting } from "@/src/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const BATCH_SIZE = 100;

const processMeeting = async (meeting: any, document_text: any) => {
  const rawMeetingJson = meeting.json as any;
  const documentList = rawMeetingJson["documentList"] ?? [];

  const document = documentList.find(
    (d: any) => d["id"] === document_text.primeGovDocumentId
  );

  if (!document) {
    console.log(
      `Document ${document_text.primeGovDocumentId} not found in meeting ${meeting.primeGovMeetingId}`
    );
  }

  const documentUrl = `https://${meeting.primeGovClient}.primegov.com/Public/CompiledDocument?meetingTemplateId=${document["templateId"]}&compileOutputType=1`;

  console.log(
    meeting.primeGovClient,
    meeting.primeGovMeetingId,
    document["id"],
    documentUrl
  );

  await db
    .update(primeGovDocumentText)
    .set({ documentUrl })
    .where(
      and(
        eq(
          primeGovDocumentText.primeGovClient,
          meeting.raw_prime_gov_meeting.primeGovClient
        ),
        eq(
          primeGovDocumentText.primeGovMeetingId,
          meeting.raw_prime_gov_meeting.primeGovMeetingId
        ),
        eq(primeGovDocumentText.primeGovDocumentId, document["id"])
      )
    );

  console.log(
    `Updated document URL for document ${document["id"]} for meeting ${meeting.raw_prime_gov_meeting.primeGovMeetingId}`
  );
};

const main = async () => {
  console.log("Starting PrimeGov document URL backfill...");

  let totalProcessed = 0;

  while (true) {
    // Get batch of meetings that need document URL backfilled
    const resultsNeedingBackfill = await db
      .select({
        raw_prime_gov_meeting: rawPrimeGovMeeting,
        prime_gov_document_text: primeGovDocumentText,
      })
      .from(rawPrimeGovMeeting)
      .innerJoin(
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
      .where(isNull(primeGovDocumentText.documentUrl))
      .limit(BATCH_SIZE);

    if (resultsNeedingBackfill.length === 0) {
      break;
    }

    console.log(
      `Processing batch of ${resultsNeedingBackfill.length} meetings (processed: ${totalProcessed})`
    );

    // Process meetings one at a time
    for (const result of resultsNeedingBackfill) {
      await processMeeting(
        result.raw_prime_gov_meeting,
        result.prime_gov_document_text
      );
    }

    totalProcessed += resultsNeedingBackfill.length;
  }

  console.log(
    `Finished PrimeGov document URL backfill. Total meetings processed: ${totalProcessed}`
  );
};

main().catch(console.error);
