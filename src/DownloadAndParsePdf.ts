import pdf from "pdf-parse";

async function downloadWithSizeLimit(url: string, maxSizeBytes: number) {
  // Create an AbortController
  const controller = new AbortController();
  const signal = controller.signal;

  // Start the fetch with the abort signal
  const response = await fetch(url, { signal });

  // Check Content-Length header (if available)
  const contentLength = response.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    controller.abort();
  }

  const arrayBuffer = await response.arrayBuffer();

  return arrayBuffer;
}

export const downloadAndParsePdf = async (
  url: string,
  sizeLimitBytes: number = 1024 * 1024 * 10
): Promise<string | null> => {
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await downloadWithSizeLimit(url, sizeLimitBytes);
  } catch (e) {
    console.error(`Error downloading ${url}: ${e}`);
    return null;
  }

  let parsedPdf;
  try {
    parsedPdf = await pdf(Buffer.from(arrayBuffer));
  } catch (e) {
    console.error(`Error parsing ${url}: ${e}`);
    return null;
  }

  return parsedPdf.text;
};
