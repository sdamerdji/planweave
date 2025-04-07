import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) {
  throw new Error('MISTRAL_API_KEY environment variable is not set');
}

const client = new Mistral({apiKey: apiKey});

export const downloadAndParsePdf = async (
  url: string,
  sizeLimitBytes: number = 1024 * 1024 * 10
): Promise<string | null> => {
  try {
    // Use Mistral's OCR API to process the PDF from the URL
    const ocrResponse = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: url
      },
      includeImageBase64: false // TODO: switch to true and add images to database
    });

    // Extract and combine text from all pages
    if (!ocrResponse.pages || ocrResponse.pages.length === 0) {
      console.error(`No pages extracted from ${url}`);
      return null;
    }

    // Combine markdown content from all pages
    const combinedText = ocrResponse.pages
      .sort((a, b) => a.index - b.index) // Ensure pages are in order
      .map(page => page.markdown)
      .join('\n\n');
    
    // TODO: Add images to database

    return combinedText;
  } catch (e) {
    console.error(`Error processing ${url} with OCR: ${e}`);
    return null;
  }
};

