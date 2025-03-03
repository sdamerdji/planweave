import { db } from "@/src/db";
import {
  documentChunk,
  matter,
  matterAttachment,
  matterAttachmentText,
} from "@/src/db/schema";
import { cosineDistance, eq } from "drizzle-orm";
import { embedTexts } from "@/src/EmbeddingClient";
import { program } from "commander";

let query: string = "";
program.argument("<query>").action((q) => (query = q));

program.parse(process.argv);

const testEmbeddingsOnAttachments = async () => {
  const queryEmbedding = Object.values(await embedTexts([query]))[0];

  const topK = await db
    .select()
    .from(matterAttachmentText)
    .innerJoin(
      matterAttachment,
      eq(
        matterAttachmentText.matterAttachmentId,
        matterAttachment.matterAttachmentId
      )
    )
    // .innerJoin(matter, eq(matterAttachment.matterId, matter.matterId))
    .orderBy(cosineDistance(matterAttachmentText.embedding, queryEmbedding))
    .limit(5);

  for (const result of topK) {
    // console.log(result.text);
    console.log(
      `http://sunnyvaleca.legistar.com/gateway.aspx?m=l&id=/matter.aspx?key=${result.matter_attachment.matterId}`,
      result.matter_attachment.hyperlink
    );
  }
};

const testEmbeddingsOnChunks = async () => {
  const queryEmbedding = Object.values(await embedTexts([query]))[0];

  const topK = await db
    .select()
    .from(documentChunk)
    // .innerJoin(
    //   matterAttachment,
    //   eq(
    //     matterAttachmentText.matterAttachmentId,
    //     matterAttachment.matterAttachmentId
    //   )
    // )
    // .innerJoin(matter, eq(matterAttachment.matterId, matter.matterId))
    .orderBy(cosineDistance(documentChunk.embedding, queryEmbedding))
    .limit(5);

  for (const result of topK) {
    // console.log(result.text);
    console.log(
      // `http://sunnyvaleca.legistar.com/gateway.aspx?m=l&id=/matter.aspx?key=${result.matter_attachment.matterId}`,
      // result.matter_attachment.hyperlink
      result.text
    );
    console.log();
  }
};

testEmbeddingsOnChunks().catch(console.error);
