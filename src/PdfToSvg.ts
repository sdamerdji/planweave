import { env } from "./env";
import convertApi from "convertapi";

// @ts-expect-error
const convertApiClient = convertApi(env.CONVERT_API_SECRET_KEY);

// TODO: this kinda sucks; talk to Shadley before trying to use this
export const pdfToSvgs = async (path: string) => {
  const response = await convertApiClient.convert(
    "svg",
    {
      File: path,
    },
    "pdf"
  );

  await response.saveFiles("./svgs");
};
