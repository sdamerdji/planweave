import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { supabase, UPLOADED_PLAN_BUCKET } from "@/src/SupabaseClient";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// TODO
const BUCKET_PATH = "concord_adu_5/webp/";

export async function POST(request: Request) {
  const { data, error } = await supabase.storage
    .from(UPLOADED_PLAN_BUCKET)
    .list(BUCKET_PATH);

  if (error || !data) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching uploaded plans" },
      { status: 500 }
    );
  }

  const results: Record<string, boolean> = {};

  for (const file of data.slice(0, 1)) {
    const { data: fileData } = await supabase.storage
      .from(UPLOADED_PLAN_BUCKET)
      .getPublicUrl(`${BUCKET_PATH}${file.name}`);

    console.log(fileData);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a senior architect. You are given a plan and you need to determine which pages contain one of the following types of content:
- A floor plan
- A schedule

Return only yes if at least one of these is present on the page, otherwise return only no.
`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: fileData.publicUrl } },
          ],
        },
      ],
    });

    results[file.name.split(".")[0]] =
      response.choices[0].message.content === "yes";
  }
  return NextResponse.json({ message: "Done", results });
}
