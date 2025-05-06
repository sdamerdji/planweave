import { NextResponse } from "next/server";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { env } from "@/src/env";
import { supabase, UPLOADED_PLAN_BUCKET } from "@/src/SupabaseClient";
import { DEMO_BUCKET_PATH } from "@/src/constants";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { comments } = await req.json();

    // Get the plan image from Supabase storage
    const { data, error } = await supabase.storage
      .from(UPLOADED_PLAN_BUCKET)
      .download(DEMO_BUCKET_PATH);

    if (error || !data) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Upload the image to Gemini
    const image = await ai.files.upload({
      file: data,
    });

    const systemPrompt = `
    You are an expert architect reviewing a building plan. Given the plan image and a list of comments from previous plan reviews, determine which 5 comments are most relevant to this specific plan.

    Return ONLY the relevant comments, one per line, with no additional text or formatting. Do not include any explanations, numbering, or other text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [
        createUserContent([
          "Analyze this plan and determine which comments are most relevant",
          createPartFromUri(image.uri!, image.mimeType!),
          JSON.stringify(comments),
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

    const relevantComments = response
      .text!.split("\n")
      .filter((line) => line.trim());

    return NextResponse.json({ relevantComments });
  } catch (error) {
    console.error("Error applying comments:", error);
    return NextResponse.json(
      { error: "Failed to apply comments" },
      { status: 500 }
    );
  }
}
