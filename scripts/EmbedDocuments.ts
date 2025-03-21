import { db } from "@/src/db";
import { matterAttachmentText } from "@/src/db/schema";
import { embedTexts } from "@/src/EmbeddingClient";
import { eq, isNotNull, isNull } from "drizzle-orm";
import _ from "lodash";

const embedDocuments = async () => {
  while (true) {
    console.log("Fetching another batch of 50 documents to embed");
    const unembeddedAttachments = await db
      .select()
      .from(matterAttachmentText)
      .where(isNull(matterAttachmentText.embedding))
      .limit(50);

    if (unembeddedAttachments.length === 0) {
      console.log("No more documents to embed");
      break;
    }

    const unembeddedTexts = unembeddedAttachments.map((attachment) =>
      // openAI limit is 8192
      attachment.text.slice(0, 2000)
    );

    const startTs = Date.now();
    const embeddingByText = await embedTexts(unembeddedTexts);
    console.log(
      `Embedded ${unembeddedTexts.length} texts in ${Date.now() - startTs}ms`
    );

    for (const [attachment, text] of _.zip(
      unembeddedAttachments,
      unembeddedTexts
    )) {
      const embedding = embeddingByText[text!];
      if (!embedding) {
        console.error(`Failed to embed text for attachment ${attachment!.id}`);
        continue;
      }

      await db
        .update(matterAttachmentText)
        .set({
          embedding,
        })
        .where(eq(matterAttachmentText.id, attachment!.id));
    }
  }
};

embedDocuments().catch(console.error);
