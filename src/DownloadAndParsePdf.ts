import pdf from "pdf-parse";

async function downloadWithSizeLimit(
  url: string,
  maxSizeBytes: number,
  expectedContentType?: string
): Promise<ArrayBuffer | null> {
  // Create an AbortController
  const controller = new AbortController();
  const signal = controller.signal;

  // Start the fetch with the abort signal
  const response = await fetch(url, { signal });

  if (expectedContentType) {
    const contentType = response.headers.get("Content-Type");
    if (contentType !== expectedContentType) {
      console.error(
        `Expected content type ${expectedContentType}, got ${contentType}`
      );
      controller.abort();
      return null;
    }
  }

  // Check Content-Length header (if available)
  const contentLength = response.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    controller.abort();
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();

  return arrayBuffer;
}

export const downloadAndParsePdf = async (
  url: string,
  sizeLimitBytes: number = 1024 * 1024 * 10
): Promise<string | null> => {
  let arrayBuffer: ArrayBuffer | null;
  try {
    arrayBuffer = await downloadWithSizeLimit(
      url,
      sizeLimitBytes,
      "application/pdf"
    );
  } catch (e) {
    console.error(`Error downloading ${url}: ${e}`);
    return null;
  }

  if (!arrayBuffer) {
    console.error(`Error downloading ${url}`);
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
