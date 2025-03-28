import { db } from "@/src/db";
import { civicPlusDocumentText, rawCivicplusAsset } from "@/src/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const BATCH_SIZE = 100;

const main = async () => {
  console.log("Starting CivicPlus document URL backfill...");

  // let offset = 0;
  let totalProcessed = 0;

  while (true) {
    // Get batch of civic_plus_document_text entries that need documentUrl backfilled
    const documentsNeedingBackfill = await db
      .select({
        document_text: civicPlusDocumentText,
        raw_asset: rawCivicplusAsset,
      })
      .from(civicPlusDocumentText)
      .innerJoin(
        rawCivicplusAsset,
        and(
          eq(civicPlusDocumentText.cityName, rawCivicplusAsset.cityName),
          eq(
            civicPlusDocumentText.civicplusMeetingId,
            rawCivicplusAsset.civicplusMeetingId
          )
        )
      )
      .where(isNull(civicPlusDocumentText.documentUrl))
      .orderBy(
        civicPlusDocumentText.cityName,
        civicPlusDocumentText.civicplusMeetingId
      )
      .limit(BATCH_SIZE);

    if (documentsNeedingBackfill.length === 0) {
      break;
    }

    console.log(
      `Processing batch of ${documentsNeedingBackfill.length} documents (processed: ${totalProcessed})`
    );

    // Process each document in the batch
    for (const document of documentsNeedingBackfill) {
      const rawAssetJson = document.raw_asset.json as any;
      const documentUrl = rawAssetJson.url;

      if (documentUrl) {
        await db
          .update(civicPlusDocumentText)
          .set({ documentUrl })
          .where(
            and(
              eq(
                civicPlusDocumentText.cityName,
                document.document_text.cityName
              ),
              eq(
                civicPlusDocumentText.civicplusMeetingId,
                document.document_text.civicplusMeetingId
              ),
              eq(
                civicPlusDocumentText.documentId,
                document.document_text.documentId
              )
            )
          );
        console.log(
          `Updated document URL for document ${document.document_text.documentId}`
        );
      } else {
        console.log(
          `No document URL found for document ${document.document_text.documentId}`
        );
      }
    }

    // offset += BATCH_SIZE;
    totalProcessed += documentsNeedingBackfill.length;
  }

  console.log(
    `Backfill completed. Total documents processed: ${totalProcessed}`
  );
};

main().catch(console.error);
