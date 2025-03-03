import { db } from "@/src/db";
import { matterAttachment, matterAttachmentText } from "@/src/db/schema";
import { and, eq, isNull, isNotNull, ilike } from "drizzle-orm";

import _ from "lodash";
import pdf from "pdf-parse";

async function downloadWithSizeLimit(url: string, maxSizeBytes: number) {
  // Create an AbortController
  const controller = new AbortController();
  const signal = controller.signal;

  // Start the fetch with the abort signal
  const response = await fetch(url, { signal });

  // Check Content-Length header (if available)
  const contentLength = response.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    controller.abort();
  }

  const arrayBuffer = await response.arrayBuffer();

  return arrayBuffer;
}

async function downloadAndParseAttachments() {
  const toProcessAttachments = await db
    .select()
    .from(matterAttachment)
    .leftJoin(
      matterAttachmentText,
      eq(
        matterAttachment.matterAttachmentId,
        matterAttachmentText.matterAttachmentId
      )
    )
    .where(
      and(
        isNull(matterAttachmentText.id),
        isNotNull(matterAttachment.hyperlink),
        ilike(matterAttachment.fileName, "%pdf")
      )
    );

  console.log(`Found ${toProcessAttachments.length} attachments to process`);

  const attachmentQueue = [...toProcessAttachments];
  let parsedPdfQueue: { matterAttachmentId: number; text: string }[] = [];
  let fetchingDone = false;

  const downloadAndParseAttachment = async (
    coroNum: number,
    verbose: boolean = false
  ) => {
    while (attachmentQueue.length > 0) {
      if (verbose) {
        console.log(
          `[downloadAndParseAttachment ${coroNum}] getting next item (${attachmentQueue.length} left)`
        );
      }
      const { matter_attachment: matterAttachment } = attachmentQueue.pop()!;

      const url = matterAttachment.hyperlink!;

      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await downloadWithSizeLimit(url, 1024 * 1024 * 10);
      } catch (e) {
        console.error(
          `[downloadAndParseAttachment ${coroNum}] Error downloading ${url}: ${e}`
        );
        continue;
      }

      let parsedPdf;
      try {
        parsedPdf = await pdf(Buffer.from(arrayBuffer));
      } catch (e) {
        console.error(
          `[downloadAndParseAttachment ${coroNum}] Error parsing ${url}: ${e}`
        );
        continue;
      }

      parsedPdfQueue.push({
        matterAttachmentId: matterAttachment.matterAttachmentId!,
        text: parsedPdf.text,
      });
    }

    if (verbose) {
      console.log(`[downloadAndParseAttachment ${coroNum}] exiting`);
    }
  };

  const writeParsedText = async () => {
    while (!fetchingDone || parsedPdfQueue.length > 0) {
      console.log(
        `[writeParsedText] Writing ${parsedPdfQueue.length} parsed texts`
      );
      if (parsedPdfQueue.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      try {
        await db.insert(matterAttachmentText).values(
          parsedPdfQueue.map(({ matterAttachmentId, text }) => ({
            matterAttachmentId,
            text,
          }))
        );
      } catch (e) {
        console.error(`[writeParsedText] Error writing to database: ${e}`);
      } finally {
        parsedPdfQueue = [];
      }
    }
  };

  const fetchThreadsPromise = Promise.all(
    _.range(10).map((i) =>
      downloadAndParseAttachment(i, true).catch(console.error)
    )
  ).then(() => {
    fetchingDone = true;
  });

  await Promise.all([
    fetchThreadsPromise,
    writeParsedText().catch(console.error),
  ]);
  console.log("exiting!");
}

downloadAndParseAttachments().catch(console.error);
