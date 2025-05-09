// app/api/signup/route.ts
import Airtable from "airtable";
import { NextResponse } from "next/server";

// Personal Access Token for Airtable
const pat =
  "paty9Vb2szSUg6aNq.160342a758cae55929d35f9ccc2148d95e771366ef034ce2dee8440f501c156d";
const baseId = "appFI1HPLlijrA6VM";

// Log for debugging
console.log("Using baseId:", baseId);

// Configure Airtable with the PAT
Airtable.configure({
  apiKey: pat,
  endpointUrl: "https://api.airtable.com",
});

// Get a reference to the base
const base = Airtable.base(baseId);

export async function POST(request: Request) {
  try {
    const { email, additionalQuestion, additionalAnswer } =
      await request.json();

    console.log("Received form data:", {
      email,
      additionalQuestion,
      additionalAnswer,
    });

    // Simple validation
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Store the email and additional information in Airtable
    try {
      // Try to create record in the table using its ID
      const tableName = "tblH0VUDLhok5cimV";
      console.log(`Attempting to create record in '${tableName}' table...`);

      // Prepare the record data - use the exact column names from Airtable
      const recordData: Record<string, any> = {
        Email: email,
      };

      // Only add these fields if they exist - using the exact column names from Airtable
      if (additionalQuestion && additionalAnswer) {
        recordData["additionalQuestion"] = additionalQuestion;
        recordData["additionalAnswer"] = additionalAnswer;
      }

      console.log("Sending to Airtable:", recordData);

      const record = await base(tableName).create(recordData);

      console.log(`Success with table: ${tableName}`);
      console.log(
        `New signup added to Airtable table '${tableName}':`,
        recordData,
        "Record ID:",
        record.getId()
      );

      return NextResponse.json(
        { success: true, message: "Email registered successfully" },
        { status: 200 }
      );
    } catch (airtableError) {
      console.error("Airtable error:", airtableError);
      // Fallback - just log the data if Airtable fails
      console.log("Fallback logging - new signup:", {
        email,
        additionalQuestion,
        additionalAnswer,
      });

      // Still return success to the user even if Airtable fails
      return NextResponse.json(
        { success: true, message: "Email registered successfully" },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error in signup API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ message: "This route only supports POST" });
}
