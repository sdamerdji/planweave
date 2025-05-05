import { sendEmail } from "./emailSender";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Test sending an email using nodemailer
 */
async function testEmailSending() {
  try {
    console.log("\n📧 EMAIL TEST 📧");
    console.log("=================");
    console.log("Checking environment...");

    // Check if env variables are set
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error("Missing GMAIL_USER or GMAIL_APP_PASSWORD in .env file");
      process.exit(1);
    }

    console.log("Required environment variables found");
    console.log("Attempting to send a test email...");

    const recipient =
      process.env.TEST_EMAIL_RECIPIENT || process.env.GMAIL_USER;
    const messageId = await sendEmail(
      recipient,
      "Test Email from Nodemailer",
      `
      <h1>Hello!</h1>
      <p>This is a test email sent using Nodemailer.</p>
      <p>It was sent at: ${new Date().toLocaleString()}</p>
      <p>If you're seeing this, the email sending functionality is working correctly.</p>
      `
    );

    console.log(
      `✅ Success! Email sent to ${recipient} with message ID: ${messageId}`
    );
  } catch (error) {
    console.error("\n❌ Failed to send test email:");
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

// Run the test
testEmailSending();
