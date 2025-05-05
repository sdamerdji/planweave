import { db } from "@/src/db";
import { planReviewComment } from "@/src/db/schema";
import { embedTexts } from "@/src/EmbeddingClient";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Fetching comments without embeddings...");
  const comments = await db
    .select()
    .from(planReviewComment)
    .where(sql`${planReviewComment.embedding} IS NULL`);

  console.log(`Found ${comments.length} comments without embeddings`);

  if (comments.length === 0) {
    console.log("No comments need backfilling");
    return;
  }

  const texts = comments.map((c) => c.comment);
  console.log("Generating embeddings...");
  const embeddings = await embedTexts(texts, true);

  console.log("Updating database...");
  let updated = 0;
  for (const comment of comments) {
    const embedding = embeddings[comment.comment];
    if (!embedding) {
      console.log(`Warning: No embedding generated for comment ${comment.id}`);
      continue;
    }

    await db
      .update(planReviewComment)
      .set({ embedding })
      .where(sql`${planReviewComment.id} = ${comment.id}`);
    updated++;
  }

  console.log(`Successfully updated ${updated} comments`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
