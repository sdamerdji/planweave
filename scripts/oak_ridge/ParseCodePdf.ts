import {
  downloadAndParsePdf,
  uploadAndParsePdf,
} from "@/src/DownloadAndParsePdf";
import { db } from "@/src/db";
import { codeDocument } from "@/src/db/schema";

const main = async () => {
  const pdf = await uploadAndParsePdf(
    "./code_documents/oak_ridge_zoning_ordinance.pdf"
  );

  await db.insert(codeDocument).values({
    pdfUrl:
      "https://www.oakridgetn.gov/DocumentCenter/View/119/Zoning-Ordinance-PDF",
    pdfTitle: "Oak Ridge Zoning Ordinance",
    pdfContent: pdf,
    jurisdiction: "oak_ridge_tn",
  });
};

main();
