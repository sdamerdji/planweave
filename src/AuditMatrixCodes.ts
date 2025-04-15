import openai from "openai";
import dotenv from "dotenv";
import cdbgMatrixCodes from "@/src/MatrixCodes";
import { db } from "@/src/db";
import { hudDocument } from "@/src/db/schema";
import { eq } from "drizzle-orm";

dotenv.config();

const client = new openai.OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// type Activity = {
//   code: string;
//   description: string;
// };

// const ACTIVITIES: Activity[] = [
//   {
//     code: "03E",
//     description: `
// DESCRIPTION: Interior and exterior tenant and Americans with Disabilities (ADA)
// improvements including renovation of restrooms and program spaces, installation
// of new fire suppression system, communication system, modular elevator, windows,
// HVAC systems, building roof, flooring, lighting and power systems.

// ACCOMPLISHMENTS: For fiscal year 2021 closeout, construction has completed and
// project is serving clients. Total improvements include: Remodeling of existing
// restrooms make them ADA accessible, remodeling of existing locker/shower rooms
// into program spaces and storage, general renovation of all spaces within the
// building, includes new flooring, paint, ceiling and finishes, new lighting
// throughout, new HVAC systems throughout, code upgrades including widening
// doorways, signage, assistive listening systems, fire alarm system, upgrade of
// the HVAC and lighting controls system, installation of code compliant fire
// suppression system, fire safety improvements, new modular elevator to provide
// access to all levels of the building, HVAC system for the gymnasium, new windows
// and upgrade to steel windows, removal boilers and equipment that was serving the
// pool, which is now unused, exterior facade improvements include new stucco color
// coat, custom built-in gutter system, lobby upgrades to include rebuilding the
// front reception desk, specialty ceiling and wall treatments, roof replacements,
// interior furnishing, energy efficient interior lighting, furnishings, and
// related improvements.
// `,
//   },
//   {
//     code: "18C",
//     description: `
// DESCRIPTION: Funds for micro-enterprise business support services for potential
// small business loan clients and existing loan clients (served by the Small
// Business Revolving Loan Fund.

// ACCOMPLISHMENTS: For Fiscal Year 2018, the CDC Small Business Finance worked
// with the City to define loan product, policy, and guidelines. Identified future
// partners in marketing the loan including Logan Heights CDC, San Ysidro Chamber
// of Commerce, San Diego Diamond BID, and City Heights CDC. Will continue to
// establish ongoing training with partners in LMI communities to pre-qualify
// prospective borrowers for the loan program.
// `,
//   },
// ];

const explainMatrixCodeError = async (
  matrixCodeDescription: string,
  activityDescription: string
) => {
  const systemPrompt = `
You are an expert auditor at HUD, tasked with determining if the activity
description is eligible for the matrix code.

The provided activity has already been found to be inappropriately classified.

Provide a one-sentence explanation for why the activity is not a good fit for the matrix code.
`;

  const userPrompt = `
<matrix-code-description>
${matrixCodeDescription}
</matrix-code-description>

<activity-description>
${activityDescription}
</activity-description>`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
  });

  return response.choices[0].message.content!.trim();
};

const auditMatrixCodeWithLLM = async (
  matrixCodeDescription: string,
  activityDescription: string
): Promise<boolean> => {
  const systemPrompt = `
You are an expert auditor at HUD, tasked with determining if the activity
description is eligible for the matrix code.

Respond with only a single word: YES or NO.`;

  const userPrompt = `
<matrix-code-description>
${matrixCodeDescription}
</matrix-code-description>

<activity-description>
${activityDescription}
</activity-description>`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    logprobs: true,
    temperature: 0,
  });

  const choice = response.choices[0].message.content?.trim();
  if (!choice || !["YES", "NO"].includes(choice)) {
    throw new Error(`Invalid response: ${choice}`);
  }

  // TODO: evaluate confidence with logprobs

  return choice === "YES";
};

const extractMatrixCode = (text: string): string | null => {
  const match = text.match(/Matrix Code: .*\((\w+)\)/m);
  return match?.[1] ?? null;
};

export const auditActivityMatrixCode = async (
  activity: string
): Promise<{ matrixCode: string | null; explanation: string | null }> => {
  const matrixCode = extractMatrixCode(activity);
  if (!matrixCode) {
    console.error(`No matrix code found in activity`);
    return { matrixCode: null, explanation: null };
  }

  const matrixCodeDescription = cdbgMatrixCodes.find(
    (code) => code.code === matrixCode
  )?.description;

  if (!matrixCodeDescription) {
    console.error(`Unrecognized matrix code: ${matrixCode}`);
    return { matrixCode: null, explanation: null };
  }

  const result = await auditMatrixCodeWithLLM(matrixCodeDescription, activity);

  if (!result) {
    const explanation = await explainMatrixCodeError(
      matrixCodeDescription,
      activity
    );
    return { matrixCode, explanation };
  }

  return { matrixCode, explanation: null };
};
