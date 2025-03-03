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

export const embedTexts = async (texts: string[]) => {
  console.log(`Embedding ${texts.length} texts`);
  const cachedEmbeddingByText = await getEmbeddingsFromCache(texts);
  console.log(
    `Found ${Object.keys(cachedEmbeddingByText).length} cached embeddings`
  );
  const missingTexts = texts.filter((text) => !(text in cachedEmbeddingByText));
  console.log(`Requesting ${missingTexts.length} embeddings from OpenAI`);

  let openaiEmbeddingByText: Record<string, number[]> = {};
  while (missingTexts.length > 0) {
    const batch = [];
    while (
      missingTexts.length > 0 &&
      _.sum(batch.map((t) => t.length)) < OPENAI_TOKEN_LIMIT * CHARS_PER_TOKEN
    ) {
      batch.push(missingTexts.pop()!);
    }
    if (
      batch.length > 1 &&
      _.sum(batch.map((t) => t.length)) > OPENAI_TOKEN_LIMIT * CHARS_PER_TOKEN
    ) {
      missingTexts.push(batch.pop()!);
    }

    console.log(`Submitting batch of ${batch.length} texts to OpenAI`);
    console.log(`Chars: ${_.sum(batch.map((t) => t.length))}`);

    let newEmbeddingsByText;
    try {
      newEmbeddingsByText = await getEmbeddingsFromOpenAI(batch);
    } catch (e) {
      console.error("Error embedding texts", e);
      continue;
    }

    openaiEmbeddingByText = {
      ...openaiEmbeddingByText,
      ...newEmbeddingsByText,
    };
  }

  if (Object.keys(openaiEmbeddingByText).length > 0) {
    await db.insert(embeddingCache).values(
      Object.entries(openaiEmbeddingByText).map(([text, embedding]) => ({
        textHash: hash(text),
        embedding,
      }))
    );
  }

  return { ...cachedEmbeddingByText, ...openaiEmbeddingByText };
};
