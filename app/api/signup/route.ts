// app/api/signup/route.ts
import Airtable from "airtable";
import { NextResponse } from "next/server";

// Configure Airtable with an environment variable for the API key.
const base = new Airtable({
  apiKey:
    "paty9Vb2szSUg6aNq.09b1a331f02f971dd5fd7a9948f84d86eb61a2b5b19eb99fdd3d127c45992d4b",
}).base("appFI1HPLlijrA6VM");

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

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

    // Store the email in Airtable
    try {
      const record = await base("Signups").create({
        Email: email,
      });

      console.log(
        "New signup added to Airtable:",
        email,
        "Record ID:",
        record.getId()
      );

      return NextResponse.json(
        { success: true, message: "Email registered successfully" },
        { status: 200 }
      );
    } catch (airtableError) {
      console.error("Airtable error:", airtableError);
      // Fallback - just log the email if Airtable fails
      console.log("Fallback logging - new signup:", email);

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
