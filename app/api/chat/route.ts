import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ],
    });

    const responseText = response.choices[0].message.content;

    return NextResponse.json(
      { success: true, responseText: responseText },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error on chat completion:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete" },
      { status: 500 }
    );
  }
}
