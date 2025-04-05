import { JocoCodePdfUrls } from "@/src/constants";
import { codeChunk, codeDocument } from "@/src/db/schema";
import { db } from "@/src/db";
import { downloadAndParsePdf } from "@/src/DownloadAndParsePdf";

const main = async () => {
  for (const pdf of JocoCodePdfUrls) {
    const pdfContent = await downloadAndParsePdf(pdf.url);

    if (!pdfContent) {
      console.error(`Failed to download PDF: ${pdf.url}`);
      continue;
    }

    await db.insert(codeDocument).values({
      pdfUrl: pdf.url,
      pdfTitle: pdf.title,
      jurisdiction: "johnson_county_ks",
      pdfContent: pdfContent,
    });
  }
};

main().catch(console.error);
