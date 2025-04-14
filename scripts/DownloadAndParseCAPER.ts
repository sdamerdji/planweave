import { hudDocument } from "../src/db/schema";
import { db } from "../src/db";
import { downloadAndParsePdf } from "../src/DownloadAndParsePdf";

// Default PDF URL for San Diego's CAPER report
const DEFAULT_CAPER_PDF_URL = "https://www.sandiego.gov/sites/default/files/2024-09/attachment-2-city-of-san-diego-fy-2024-caper-idis-reports.pdf";

const main = async () => {
  // Use command line argument if provided, otherwise use default URL
  const pdfUrl = process.argv[2] || DEFAULT_CAPER_PDF_URL;
  
  console.log(`Downloading and parsing CAPER PDF from: ${pdfUrl}`);
  
  try {
    const pdfContent = await downloadAndParsePdf(pdfUrl);

    if (!pdfContent) {
      console.error(`Failed to download or parse PDF: ${pdfUrl}`);
      process.exit(1);
    }

    console.log(`Successfully parsed PDF. Inserting into database...`);

    // Extract jurisdiction from URL (simple example - may need more robust approach)
    const urlParts = new URL(pdfUrl).hostname.split('.');
    let jurisdiction = urlParts[1] || urlParts[0];
    
    // For san diego specifically 
    if (pdfUrl === DEFAULT_CAPER_PDF_URL) {
      jurisdiction = "san_diego_ca";
    }

    // Insert into hudDocument table
    await db.insert(hudDocument).values({
      jurisdiction,
      documentUrl: pdfUrl,
      text: pdfContent,
    });

    console.log(`Successfully inserted CAPER document into database for ${jurisdiction}`);
  } catch (error) {
    console.error("Error in CAPER processing:", error);
    process.exit(1);
  }
};

main().catch(console.error); 