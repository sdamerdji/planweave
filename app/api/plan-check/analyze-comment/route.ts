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

// TODO
const IMAGE_WIDTH = 2500;
const IMAGE_HEIGHT = 1667;

export async function POST(req: Request) {
  try {
    const { comment } = await req.json();

    if (!comment) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

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

    // First request: Get compliance suggestions
    const compliancePrompt = `
You are an expert architect reviewing a building plan. You'll be given a plan, and a comment that other architects frequently recieve on other projects.

Explain the steps to be taken to make sure *this* plan won't recieve the same comment.

Your explanation should be concise, two sentences.
    `;

    const complianceResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [
        createUserContent([
          "What specific things should be checked or modified to address this comment?",
          createPartFromUri(image.uri!, image.mimeType!),
          comment,
        ]),
      ],
      config: {
        systemInstruction: compliancePrompt,
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: 0,
        },
      },
    });

    // Second request: Get bounding box
    const bboxPrompt = `
You are an expert architect reviewing a building plan.

Given a specific comment about the plan, provide a bounding box of the room or part of the room within the floor plan that is relevant to this comment.
    `;

    const bboxResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [
        createUserContent([
          "What area of the plan is relevant to this comment?",
          createPartFromUri(image.uri!, image.mimeType!),
          comment,
        ]),
      ],
      config: {
        systemInstruction: bboxPrompt,
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: 0,
        },
      },
    });

    const explanation = complianceResponse.text!;
    console.log(bboxResponse.text);
    const trimmedBbox = bboxResponse
      .text!.replace("```json", "")
      .replace("```", "");
    console.log(trimmedBbox);
    const rawBbox = JSON.parse(trimmedBbox)[0]["box_2d"];
    console.log(rawBbox);

    return NextResponse.json({
      explanation,
      bbox: {
        x1: rawBbox[1] * (IMAGE_WIDTH / 1000),
        y1: rawBbox[0] * (IMAGE_HEIGHT / 1000),
        x2: rawBbox[3] * (IMAGE_WIDTH / 1000),
        y2: rawBbox[2] * (IMAGE_HEIGHT / 1000),
      },
    });
  } catch (error) {
    console.error("Error analyzing comment:", error);
    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Failed to analyze comment" },
      { status: 500 }
    );
  }
}
