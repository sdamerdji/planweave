import * as nodemailer from "nodemailer";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check for required environment variables
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

/**
 * Creates a nodemailer transport using Gmail
 */
function createTransport() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error(
      "Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables"
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Sends an email using Nodemailer with Gmail
 *
 * @param to - The recipient's email address
 * @param subject - The email subject
 * @param body - The email body (HTML supported)
 * @returns A promise that resolves with the message info
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<string> {
  try {
    console.log(`Preparing to send email to: ${to}`);

    // Create mail transport
    const transport = createTransport();

    console.log("Sending email...");
    const info = await transport.sendMail({
      from: GMAIL_USER,
      to,
      subject,
      html: body,
    });

    console.log(`✅ Email sent: ${info.messageId}`);
    return info.messageId;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
}

// Example usage:
// import { sendEmail } from './emailSender';
//
// async function testEmail() {
//   try {
//     await sendEmail(
//       'recipient@example.com',
//       'Test Email from Gmail API',
//       '<h1>Hello!</h1><p>This is a test email sent using the Gmail API.</p>'
//     );
//     console.log('Email sent successfully!');
//   } catch (error) {
//     console.error('Failed to send email:', error);
//   }
// }
//
// testEmail();
