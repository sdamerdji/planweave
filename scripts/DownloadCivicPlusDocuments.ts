// scripts/DownloadCivicPlusDocuments.ts
import { db } from "@/src/db";
import {
  rawCivicplusAsset,
  civicPlusDocumentText
} from "@/src/db/schema";
import { downloadAndParsePdf } from "@/src/DownloadAndParsePdf";
import { eq, and, isNull } from "drizzle-orm";
import _ from "lodash";

const NUM_COROUTINES = 10;

const main = async () => {
  console.log("Querying CivicPlus assets missing text...");
  
  const assetsMissingTexts = await db
    .select()
    .from(rawCivicplusAsset)
    .leftJoin(
      civicPlusDocumentText,
      and(
        eq(
          rawCivicplusAsset.civicplusMeetingId,
          civicPlusDocumentText.civicplusMeetingId
        ),
        eq(
          rawCivicplusAsset.cityName,
          civicPlusDocumentText.cityName
        )
      )
    )
    .where(isNull(civicPlusDocumentText.id));

  console.log(
    `Found ${assetsMissingTexts.length} CivicPlus assets with missing text`
  );

  const downloadAndParsePdfCoroutine = async (coroNum: number) => {
    while (assetsMissingTexts.length > 0) {
      try {
        const asset = assetsMissingTexts.pop();
        if (!asset) {
          break;
        }

        console.log(
          `[downloadAndParsePdfCoroutine ${coroNum}] Processing asset for meeting ${asset.raw_civicplus_asset.civicplusMeetingId}`
        );

        const assetJson = asset.raw_civicplus_asset.json as any;
        const url = assetJson.url;
        
        if (!url) {
          console.warn(
            `[downloadAndParsePdfCoroutine ${coroNum}] No URL found for asset: ${JSON.stringify(asset.raw_civicplus_asset)}`
          );
          continue;
        }
        
        // Create documentId by concatenating meeting_id and asset_type
        const documentId = `${assetJson.meeting_id}_${assetJson.asset_type}`;
        
        // Download and parse the PDF
        const pdfText = await downloadAndParsePdf(url);
        
        if (pdfText) {
          await db.insert(civicPlusDocumentText).values({
            cityName: asset.raw_civicplus_asset.cityName,
            civicplusMeetingId: asset.raw_civicplus_asset.civicplusMeetingId,
            documentId: documentId,
            templateName: assetJson.asset_type,
            committeeName: assetJson.committee_name || null,
            meetingDate: assetJson.meeting_date || null,
            meetingTime: assetJson.meeting_time || null,
            text: pdfText,
          });
          
          console.log(
            `[downloadAndParsePdfCoroutine ${coroNum}] Successfully saved text for document ${documentId}`
          );
        } else {
          console.error(
            `[downloadAndParsePdfCoroutine ${coroNum}] Error downloading document at URL: ${url}`
          );
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