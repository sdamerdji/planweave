import OpenAI from "openai";
import dotenv from "dotenv";
import crypto from "crypto";
import { db } from "./db";
import { inArray } from "drizzle-orm";
import { embeddingCache } from "./db/schema";
import _ from "lodash";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const hash = (text: string) => {
  return crypto.createHash("sha256").update(text).digest("hex");
};

const getEmbeddingsFromCache = async (
  texts: string[]
): Promise<Record<string, number[]>> => {
  const textByHash = texts.reduce(
    (acc: Record<string, string>, text: string) => {
      acc[hash(text)] = text;
      return acc;
    },
    {}
  );

  const cached = await db
    .select()
    .from(embeddingCache)
    .where(inArray(embeddingCache.textHash, Object.keys(textByHash)));

  return Object.fromEntries(
    cached.map((entry) => [textByHash[entry.textHash], entry.embedding])
  );
};

const getEmbeddingsFromOpenAI = async (
  texts: string[]
): Promise<Record<string, number[]>> => {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });

  return Object.fromEntries(
    _.zip(
      texts,
      response.data.map((entry) => entry.embedding)
    )
  );
};

// this is conservative; it's actually 8192
const OPENAI_TOKEN_LIMIT = 5000;
const CHARS_PER_TOKEN = 4;

export const embedTexts = async (texts: string[], verbose = false) => {
  // Deduplicate texts before processing
  const uniqueTexts = [...new Set(texts)];
  if (verbose) {
    console.log(
      `Embedding ${uniqueTexts.length} unique texts (from ${texts.length} total)`
    );
  }

  // Get cached embeddings
  const cachedEmbeddingByText = await getEmbeddingsFromCache(uniqueTexts);
  if (verbose) {
    console.log(
      `Found ${Object.keys(cachedEmbeddingByText).length} cached embeddings`
    );
  }

  // Identify texts that need embeddings
  const missingTexts = uniqueTexts.filter(
    (text) => !(text in cachedEmbeddingByText)
  );

  if (missingTexts.length === 0) {
    if (verbose) {
      console.log("All texts already have embeddings in the cache");
    }
    return cachedEmbeddingByText;
  }

  if (verbose) {
    console.log(`Requesting ${missingTexts.length} embeddings from OpenAI`);
  }

  // Process in batches
  let openaiEmbeddingByText: Record<string, number[]> = {};
  let currentBatch = [...missingTexts];

  while (currentBatch.length > 0) {
    const batch = [];

    // Build batch within token limits
    while (
      currentBatch.length > 0 &&
      _.sum(batch.map((t) => t.length)) < OPENAI_TOKEN_LIMIT * CHARS_PER_TOKEN
    ) {
      batch.push(currentBatch.pop()!);
    }

    // Ensure batch isn't too large
    if (
      batch.length > 1 &&
      _.sum(batch.map((t) => t.length)) > OPENAI_TOKEN_LIMIT * CHARS_PER_TOKEN
    ) {
      currentBatch.push(batch.pop()!);
    }

    if (batch.length === 0) break;

    if (verbose) {
      console.log(`Submitting batch of ${batch.length} texts to OpenAI`);
      console.log(`Chars: ${_.sum(batch.map((t) => t.length))}`);
    }

    try {
      const newEmbeddingsByText = await getEmbeddingsFromOpenAI(batch);

      // Insert embeddings into database - one at a time to handle conflicts
      for (const text of batch) {
        const embedding = newEmbeddingsByText[text];
        if (!embedding) continue;

        try {
          // Try inserting - if it fails due to duplicate, that's fine
          await db.insert(embeddingCache).values({
            textHash: hash(text),
            embedding,
          });
        } catch (error) {
          // Likely a conflict error, which we can safely ignore
          console.log(
            `Note: Embedding for "${text.substring(0, 20)}..." might already exist`
          );
        }

        // Add to our results regardless
        openaiEmbeddingByText[text] = embedding;
      }
    } catch (error) {
      console.error("Error embedding texts from OpenAI", error);
      // Continue with next batch
    }
  }

  return { ...cachedEmbeddingByText, ...openaiEmbeddingByText };
};
