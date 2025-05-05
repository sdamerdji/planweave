import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { planReviewComment } from "@/src/db/schema";
import { cosineDistance, sql } from "drizzle-orm";
import { embedTexts } from "@/src/EmbeddingClient";

export async function POST(req: Request) {
  try {
    const { descriptors } = await req.json();

    if (!Array.isArray(descriptors)) {
      return NextResponse.json(
        { error: "Descriptors must be an array" },
        { status: 400 }
      );
    }

    const results = [];

    const embeddings = await embedTexts(descriptors);
    for (const descriptor of descriptors) {
      const similarComments = await db
        .select()
        .from(planReviewComment)
        .where(sql`${planReviewComment.embedding} IS NOT NULL`)
        .orderBy(
          cosineDistance(planReviewComment.embedding, embeddings[descriptor])
        )
        .limit(5);

      results.push({
        descriptor,
        comments: similarComments,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching comments:", error);
    return NextResponse.json(
      { error: "Failed to search comments" },
      { status: 500 }
    );
  }
}
