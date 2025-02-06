// app/api/signup/route.ts
import Airtable from "airtable";
import { NextResponse } from "next/server";

// Configure Airtable with an environment variable for the API key.
const base = new Airtable({
  apiKey: "paty9Vb2szSUg6aNq.09b1a331f02f971dd5fd7a9948f84d86eb61a2b5b19eb99fdd3d127c45992d4b").base("appFI1HPLlijrA6VM");

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    // Optionally add email validation here

    const record = await base("Signups").create({
      Email: email,
    });

    return NextResponse.json(
      { success: true, recordId: record.getId() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating Airtable record:", error);
    return NextResponse.json(
      { success: false, error: "Unable to sign up." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ message: "This route only supports POST" });
}
