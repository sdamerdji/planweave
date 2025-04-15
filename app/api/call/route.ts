import { NextResponse } from "next/server";
import twilio from "twilio";

// Twilio credentials - preferably from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Example Twilio number

// Create a Twilio client
const client = twilio(accountSid, authToken);

export async function POST(request: Request) {
  try {
    // Extract phone number and text from request body
    const { phoneNumber, text } = await request.json();

    // Validate inputs
    if (!phoneNumber || !text) {
      return NextResponse.json(
        { success: false, error: "Phone number and text are required" },
        { status: 400 }
      );
    }

    // Log for debugging
    console.log(`Making call to ${phoneNumber} with message: ${text}`);

    // Create a TwiML document with the text to say
    const twimlText = `<Response><Say>${text}</Say></Response>`;

    // Or you can use Twilio's built-in TwiML capability:
    const call = await client.calls.create({
      from: twilioPhoneNumber,
      to: phoneNumber,
      twiml: twimlText,
    });

    return NextResponse.json(
      {
        success: true,
        callSid: call.sid,
        message:
          "Call initiated successfully. Note: You need valid Twilio credentials for this to work.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error making Twilio call:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to make call. Make sure you have valid Twilio credentials.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ message: "This route only supports POST" });
}
