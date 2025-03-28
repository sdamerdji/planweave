import { NextResponse } from "next/server";
import { OpenAIClient } from "@/src/OpenaiClient";

export async function POST(request: Request) {
  try {
    const { content, keywords } = await request.json();

    // Skip processing if content is empty
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { summary: "No content to summarize" },
        { status: 200 }
      );
    }

    // Create a prompt for the model
    const prompt = `
    What is the city doing or planning to do that's related to the user's query?

    Here is the document content:
    ${content}

    Query: “${keywords}”
    `;

    const systemPrompt = `
    You are analyzing a set of agendas for local government meetings. If the document cites a housing element program, reference the citation too.

    Ignore trivial or obvious information (e.g., basic procedural steps or routine filings).

    If a place is being upzoned (or if the general plan is being amended), you should mention what locations are affected if it's in the document

    Be succinct. Use action verbs.
    
    Don't mention planners by name. Don't mention who Annual Progress Reports (APRs) will be sent to.`;

    // Call OpenAI API
    const response = await OpenAIClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const summary = response.choices[0].message.content || "Unable to generate summary";

    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error("Error summarizing document:", error);
    return NextResponse.json(
      { summary: "Error generating summary" },
      { status: 500 }
    );
  }
} 