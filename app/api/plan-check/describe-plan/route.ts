import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { supabase, UPLOADED_PLAN_BUCKET } from "@/src/SupabaseClient";
import { OpenAI } from "openai";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { env } from "@/src/env";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

// TODO
const BUCKET_PATH = "denver_townhome/webp-small/8.webp";

export async function POST(request: Request) {
  const { data, error } = await supabase.storage
    .from(UPLOADED_PLAN_BUCKET)
    .download(BUCKET_PATH);

  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const image = await ai.files.upload({
    file: data,
    // mimeType: "image/webp",
  });

  const systemPrompt = `
You are an expert code compliance officer. It's your job to look at architectural plans and flag elements that reviewers should focus on.

Given an image, list out every element of interest and a brief description of why it might cause code compliance violations, one per line, and nothing else. Maximum of 5.

Examples of interesting elements are: parking spaces, staircases, smoke detectors`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-04-17",
    contents: [
      createUserContent([
        "Describe all of the architectural features of interest in the image",
        createPartFromUri(image.uri!, image.mimeType!),
      ]),
    ],
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: {
        includeThoughts: false,
        thinkingBudget: 0,
      },
    },
  });

  const descriptors = response.text!.split("\n");

  return NextResponse.json({ descriptors });
}
