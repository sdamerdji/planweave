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
import { DEMO_BUCKET_PATH } from "@/src/constants";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  const { data, error } = await supabase.storage
    .from(UPLOADED_PLAN_BUCKET)
    .download(DEMO_BUCKET_PATH);

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

Given an architectural plan, describe the contents. Focus on items that are known to cause code compliance issues. List the item and the code compliance concern.

Example:
Staircases, confirm width and handrail specifications
Windows near showers/baths, confirm glazing
Toilets, confirm clearance 

Provide one item per line and nothing else. Provide exactly 5 items.
`;

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
