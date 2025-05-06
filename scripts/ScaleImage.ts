import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import dotenv from "dotenv";
import { supabase } from "../src/SupabaseClient";
dotenv.config();

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// if (!supabaseUrl || !supabaseKey) {
//   throw new Error("Missing Supabase credentials");
// }

// const supabase = createClient(supabaseUrl, supabaseKey);

async function processImage(
  sourcePath: string,
  targetPath: string,
  maxWidth: number
) {
  try {
    // Download the image from Supabase storage
    const { data, error } = await supabase.storage
      .from("uploaded-plans")
      .download(sourcePath);

    if (error) throw error;
    if (!data) throw new Error("No data received from storage");

    // Convert the blob to buffer
    const buffer = Buffer.from(await data.arrayBuffer());

    // Process the image with sharp
    const processedBuffer = await sharp(buffer)
      .resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Upload the processed image
    const { error: uploadError } = await supabase.storage
      .from("uploaded-plans")
      .upload(targetPath, processedBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    console.log(`Successfully processed and uploaded image to ${targetPath}`);
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}

// Example usage
if (require.main === module) {
  const sourcePath = process.argv[2];
  const targetPath = process.argv[3];
  const maxWidth = process.argv[4] ? parseInt(process.argv[4]) : 2500;

  if (!sourcePath || !targetPath) {
    console.error(
      "Usage: yarn ts-node scripts/process-image.ts <sourcePath> <targetPath> [maxWidth]"
    );
    process.exit(1);
  }

  processImage(sourcePath, targetPath, maxWidth)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
