import { readFile, writeFile, readdir } from "fs/promises";
import { program } from "commander";
import { pdfToSvgs } from "@/src/PdfToSvg";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { env } from "@/src/env";
import convertApi from "convertapi";

const BUCKET = "uploaded-plans";

// @ts-expect-error
const convertApiClient = convertApi(env.CONVERT_API_SECRET_KEY);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

program
  .argument("<pdfPath>", "The path to the PDF file to convert to SVG")
  .option(
    "-b, --bucketPath <bucketPath>",
    "The bucket path to upload the file to"
  );

program.parse(process.argv);

const pdfPath = program.args[0];
const bucketPath = program.opts().bucketPath;

const convertPdfToSvg = async () => {
  await pdfToSvgs(pdfPath);
};

const convertAndUploadPdfAsWebp = async () => {
  // const response = await convertApiClient.convert(
  //   "webp",
  //   {
  //     File: pdfPath,
  //   },
  //   "pdf"
  // );

  // await response.saveFiles("./temp");

  // List all files in the temp directory
  const fileNames = await readdir("./temp");

  console.log(`Found ${fileNames.length} files in ./temp directory`);

  // Upload each file to Supabase storage
  for (const fileName of fileNames) {
    const filePath = `./temp/${fileName}`;
    const fileContent = await readFile(filePath);

    let bucketFileName;
    const fileNameParts = fileName.split("-");
    if (fileNameParts.length < 2) {
      bucketFileName = "1.webp";
    } else {
      bucketFileName = fileNameParts.pop();
    }
    console.log(`Uploading ${bucketFileName} to ${bucketPath}/webp/`);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(`${bucketPath}/webp/${bucketFileName}`, fileContent, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading ${bucketFileName}:`, error);
    } else {
      console.log(
        `Successfully uploaded ${bucketFileName} to ${bucketPath}/uploaded-plans/`
      );
    }
  }
};

const main = async () => {
  // await convertPdfToSvg();
  await convertAndUploadPdfAsWebp();
};

main().catch(console.error);
