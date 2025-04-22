import { OpenAIClient } from "@/src/OpenaiClient";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { codeChunk } from "@/src/db/schema";
import { cosineDistance, eq, sql, and, count } from "drizzle-orm";
import { evaluateDocumentRelevance } from "@/src/EvaluateDocumentRelevance";
import { Document } from "@/app/api/codeSearch/apiTypes";
import {
  PlanningSearchJurisdiction,
  PlanningSearchJurisdictionNames,
} from "@/src/constants";

const USE_CRAG = true;

const DEBUG = true;

// Debug logging utility
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args);
  }
};

// Extract keywords from the query
const getKeywords = async (query: string) => {
  const systemPrompt = `
    You will be provided with a user query. We're going to do keyword search
    over a large set of documents, and we need to select a couple of the most
    important keywords to search with. Choose no more than 3.

    The keywords should ONLY be proper nouns.

    EXAMPLES:

    input: Is the budget of San Francisco larger than that of New York City?
    output: San Francisco, New York City

    input: What's the most recent hearing on 1024 Market St?
    output: 1024 Market St

    input: What's the most recent hearing on the budget?
    output: None

    input: What can I build with RLD zoning?
    output: RLD

    Separate your keywords with commas.
    `;

  const response = await OpenAIClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    temperature: 0,
  });

  const responseText = response.choices[0].message.content ?? "";
  return responseText
    .split(",")
    .map((keyword) => keyword.trim())
    .flatMap((keyword) => keyword.split(" "))
    .filter((word) => word.toLocaleLowerCase() !== "none");
};

// Extract keywords from the query
const highlightKeyText = async (query: string, text: string) => {
  const systemPrompt = `You are assisting a city planner with understanding the planning code.
They will ask you a question, and you will need to return the substring in the planning code text that is most relevant to answering the question.
Do not modify anything in the substring. Do not modify the line breaks by merging sentences that span multiple lines into one line.
Highlight no more than 100 characters.
Your answer will be rejected if you do not provide an exact substring of the planning code text. If nothing is relevant, return "None".

The examples below (deliminated with XML tags) show how you should and should not
respond to the user's question. Do not return the XML tags in your response. Do not fix broken
white space in the text. Do not highlight excessively.

EXAMPLE 1:
<query>where can i dig a quarry?<planning-code-text>In any district   f
except the Residential Districts, Planned Residential
Districts,
the Planned Research and Development Park District (PEC-1) or the Planned Adult Entertainment
District (PAE), conditional uses, such as the following, may be approved by the 
Board:
1. Quarrying, mining, or earthen materials excavation or filling operations,
including but not limited to:
a. The delivery and placement of greater than 1,200 cubic yards of earth fill material or the
excavation and removal of greater than 1,200 cubic yards of any earth excavated from
any property, unless, however, such earth excavation or filling operations are necessary
for the construction of a building or structure on the subject property, or
b. The screening, crushing, washing or storage of clay, gravel, ore, sand, stone, top soil, fill
dirt or similar materials, or
c. An asphalt or concrete plant, and
d. subject to the standards and conditions in Section 6, (B)(3) of this Article.</planning-code-text></query>

<correct-output>In any district   f
except the Residential Districts, Planned Residential
Districts,
the Planned Research and Development Park District (PEC-1) or the Planned Adult Entertainment
District (PAE)</correct-output>

<incorrect-output>In any district except the Residential Districts, Planned Residential Districts, the Planned Research and Development Park District (PEC-1) or the Planned Adult Entertainment District (PAE), conditional uses, such as the following, may be approved by the Board:
1. Quarrying , mining, or earthen materials excavation or filling operations,
including but not limited to:
a. The delivery and placement of greater than 1,200 cubic yards of earth fill material or the
excavation and removal of greater than 1,200 cubic yards of any earth excavated from
any property, unless, however, such earth excavation or filling operations are necessary
for the construction of a building or structure on the subject property, or
b. The screening, crushing, washing or storage of clay, gravel, ore, sand, stone, top soil, fill
dirt or similar materials, or
c. An asphalt or concrete plant, and
d. subject to the standards and conditions in Section 6, (B)(3) of this Article.</planning-code-text></query>
</incorrect-output>

EXAMPLE 2:
<query>where can i dig a quarry?<planning-code-text>3. Quarrying or mining operations:
a. Such conditional uses shall be located nearby or adjacent to major or minor arterial
streets capable of handling the expected highway loads of heavy truck vehicular traffic.
b. To minimize adverse impact upon surrounding properties and the community at large, all
outdoor crushing, sorting, and fixed-location loading or distribution machine operations
for rock or stone, and all excavations deeper than ten (10) feet below the natural grade
shall be located not less than 50 feet to the nearest property line of adjoining commercial or 
industrial property, not less than 100 feet from the nearest property line of adjoining rural 
or residentially zoned property, and not less than 250 feet from the nearest residence 
existing at the time soil processing and handling operations began except as may be 
otherwise provided in this Section. 
In addition to the setback requirements in this subsection, the uses shall comply with 
reasonable stipulated requirements for control of noise, illumination, dust and odors as 
the Board may determine to be necessary and reasonable for the protection of the public 
health, safety and welfare of the neighborhood and the community at large. 
c. The initial Conditional Use Permit may be granted for a period not to exceed ten (10) 
years.  Renewal or extensions of said permit shall not exceed periods of ten (10) years 
each. 
d. All such conditional use operations shall be buffered and screened by a method such as 
berms and dense landscape plantings, privacy fences, and the like, when the use would be 
visible from any road, any Residential District or any Planned Residential District. 
e. The permit holder shall utilize dust abatement measures for all unpaved interior roads and 
equipment and processing areas as required by the conditional use permit. 
f. If the County finds any roads which would be used by the quarrying or mining operation 
to be inadequate for the expected quantities of traffic, especially with respect to heavy 
truck traffic, then the applicant may be required to improve and maintain the roads such 
that the roads will accommodate the anticipated traffic.  An Improvement and 
Maintenance Agreement between the applicant and the County shall be required to assure 
that the streets used by the operation will be appropriately improved and maintained. 
g. A plan for reclamation of the site shall be prepared and submitted as a part of the 
application.  The plan shall indicate a timetable for the reclamation of the site and a 
general plan for the proposed future use(s).  The reclamation plan submitted shall be 
binding to the extent required to assure that the phase of the site changes underway 
during the Conditional Use Permit term shall remain consistent with the reclamation plan 
which shows the overall intentions of the applicant for reclamation of the site.  The 
reclamation plan also shall guide determinations of the amount of surety to be posted to 
insure future reclamation of the site.  The actual reclamation plan may be amended at 
such time that the applicant is ready to begin such reclamation; however the reclamation 
plan must be approved by the Board before reclamation work may begin.  Said approval 
shall require a public hearing under the same procedures as required for the Conditional 
Use Permit.  The applicant shall post a performance bond or other surety acceptable to 
the Board to insure that the reclamation of the site will occur as required in the 
reclamation plan for the site alterations proposed to occur during the permit term.  The 
amount of reclamation surety shall be based on the estimated cost of the site reclamation 
as estimated by a qualified, registered engineer licensed in the State of Kansas and who is 
acceptable to the County.  The amount of the reclamation surety shall be reviewed with 
each renewal of said permit and may be adjusted to fit then current reclamation cost 
estimates as prepared by a qualified professional and acceptable to the County. 
h. All areas quarried or mined shall not endanger the lateral or subsurface support of 
abutting or adjoining properties.  A minimum setback of one hundred (100) horizontal 
feet from any road right-of-way and thirty (30) horizontal feet from all other property 
lines, as measured on the surface shall be provided and maintained free of any subsurface 
quarrying or mining activity unless other setbacks are verified in writing to be 
Zoning & Subdivision Regulations Johnson County, Kansas</planning-code-text></query>

<correct-output>adjacent to major or minor arterial
streets</correct-output>

<incorrect-output> Quarrying or mining operations:
a. Such conditional uses shall be located nearby or adjacent to major or minor arterial streets capable of handling the expected highway loads of heavy truck vehicular traffic.</incorrect-output>

EXAMPLE 3:
<query>how tall am i allowed to build in a residential district?<planning-code-text>GROUP H: In the following three Planned Employment Center Districts: the Planned Research,
Development and Light Industrial Park District (PEC-3) and the Planned Industrial Park District
(PEC-4); and Planned Logistics Park District (PEC-LP), conditional uses, such as the following,
may be approved by the Board:
1. Automotive Repair Shop, Repair Garage or Machinery Repair Shops for maintenance or
repair of vehicles or equipment owned or not owned by the property/business owner.</planning-code-text></query>

<correct-output>None</correct-output>

<incorrect-output>In the following three Planned Employment Center Districts: the Planned Research,
Development and Light Industrial Park District (PEC-3) and the Planned Industrial Park District</incorrect-output>
`;

  // Create the user prompt with XML tags using template literals
  const userPrompt = `<query>${query}<planning-code-text>${text}</planning-code-text></query>`;

  const response = await OpenAIClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  // The response should be either a text substring or "None"
  const responseText = response.choices[0].message.content?.trim() ?? "None";

  // Don't return a list of keywords - return the actual highlighted text
  return responseText !== "None" ? responseText : null;
};

export async function processRAGQuery(
  searchQuery: string,
  conversationHistory: { question: string; answer: string }[] = [],
  jurisdiction: PlanningSearchJurisdiction
): Promise<{
  responseText: string;
  documents: Document[];
}> {
  const queryEmbedding = Object.values(await embedTexts([searchQuery]))[0];
  const keywords = await getKeywords(searchQuery);

  const orderBy = [cosineDistance(codeChunk.embedding, queryEmbedding)];

  if (keywords.length > 0) {
    orderBy.unshift(
      sql`to_tsquery('english', ${keywords.join(" | ")}) @@ to_tsvector('english', ${codeChunk.text}) desc`
    );
  }

  // Execute the query
  const documents = await db
    .select({
      id: codeChunk.id,
      text: codeChunk.text,
      pdfTitle: codeChunk.pdfTitle,
      headingText: codeChunk.headingText,
      bodyText: codeChunk.bodyText,
      jurisdiction: codeChunk.jurisdiction,
      pdfUrl: codeChunk.pdfUrl,
    })
    .from(codeChunk)
    .where(eq(codeChunk.jurisdiction, jurisdiction))
    .orderBy(...orderBy)
    .limit(30);

  if (documents.length === 0) {
    return {
      responseText: "No relevant code chunks found.",
      documents: [],
    };
  }

  let relevantDocuments = documents;
  if (USE_CRAG) {
    const startCragTime = Date.now();
    const relevance = await Promise.all(
      documents.map((doc) => evaluateDocumentRelevance(searchQuery, doc.text))
    );
    const cragTime = Date.now() - startCragTime;
    relevantDocuments = documents.filter((_, i) => relevance[i] === true);

    if (documents.length > 0 && relevantDocuments.length === 0) {
      debugLog(
        "CRITICAL: Documents found but ALL filtered out by CRAG as not relevant. Inspect raw documents."
      );
    }
  }

  if (DEBUG) {
    for (const doc of documents) {
      debugLog(
        `[${relevantDocuments.map((d) => d.id).includes(doc.id) ? "X" : " "}] ${doc.pdfTitle} - ${doc.headingText}`
      );
    }
  }

  // Return early if no relevant documents are found
  if (relevantDocuments.length === 0) {
    return {
      responseText: "No relevant code chunks found.",
      documents: [],
    };
  }

  var topRelevantDocuments = relevantDocuments.slice(0, 5);

  const highlightPromises = topRelevantDocuments.map(async (doc) => {
    debugLog("\n=== Starting highlight process for document ===");

    const highlightedText = await highlightKeyText(searchQuery, doc.text);
    debugLog("Highlighted text from keyText:", highlightedText);

    // Validate highlight by comparing with whitespace removed
    const normalizedBody = doc.bodyText.replace(/\s+/g, "");
    const normalizedHighlight = highlightedText?.replace(/\s+/g, "") || "";
    debugLog(
      "Normalized body text (first 100 chars):",
      normalizedBody.substring(0, 100)
    );
    debugLog("Normalized highlight:", normalizedHighlight);

    const isValidHighlight =
      highlightedText && normalizedBody.includes(normalizedHighlight);

    debugLog("Is valid highlight?", isValidHighlight);

    if (!isValidHighlight && highlightedText) {
      debugLog(
        "WARNING: Highlighted text is not a substring of bodyText after removing whitespace!"
      );
      debugLog("#".repeat(10));
      debugLog(`Highlighted text: ${highlightedText}`);
      debugLog("#".repeat(10));
      debugLog(`bodyText: ${doc.bodyText}`);
    }

    const validatedHighlight = isValidHighlight ? highlightedText : null;
    debugLog("Validated highlight:", validatedHighlight);

    if (validatedHighlight) {
      // First escape any existing HTML to prevent injection
      const escapedBody = doc.bodyText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      debugLog(
        "\nEscaped body text (first 100 chars):",
        escapedBody.substring(0, 100)
      );

      // Instead of trying to create a complex regex pattern that might fail,
      // we'll perform a more direct approach to find the text in the document

      // Simple text-based approach - normalize both texts for comparison
      const normalizedBody = escapedBody.replace(/\s+/g, " ");
      const normalizedHighlight = validatedHighlight.replace(/\s+/g, " ");

      // Find the position of the highlight in the normalized body
      const highlightIndex = normalizedBody.indexOf(normalizedHighlight);

      debugLog("\nDirect text search approach:");
      debugLog("Normalized highlight:", normalizedHighlight);
      debugLog("Highlight found at index:", highlightIndex);

      if (highlightIndex !== -1) {
        // We found the text directly
        // Now provide context around the matched text
        const contextBefore = 250; // Characters of context before highlight
        const contextAfter = 250; // Characters of context after highlight

        const startPos = Math.max(0, highlightIndex - contextBefore);
        const endPos = Math.min(
          normalizedBody.length,
          highlightIndex + normalizedHighlight.length + contextAfter
        );

        // Extract the text with context
        const beforeText = normalizedBody.substring(startPos, highlightIndex);
        const matchedText = normalizedBody.substring(
          highlightIndex,
          highlightIndex + normalizedHighlight.length
        );
        const afterText = normalizedBody.substring(
          highlightIndex + normalizedHighlight.length,
          endPos
        );

        debugLog("\nContext analysis:");
        debugLog(
          "Text BEFORE highlight (last 50 chars):",
          beforeText.slice(-50)
        );
        debugLog("Text being highlighted:", matchedText);
        debugLog(
          "Text AFTER highlight (first 50 chars):",
          afterText.slice(0, 50)
        );
        debugLog("\nContext lengths:");
        debugLog("Before text length:", beforeText.length);
        debugLog("Highlighted text length:", matchedText.length);
        debugLog("After text length:", afterText.length);

        // Combine with highlighting
        const highlightedBodyText =
          beforeText + "<mark>" + matchedText + "</mark>" + afterText;

        debugLog("\nFinal highlighted text:", highlightedBodyText);
        debugLog("Final text total length:", highlightedBodyText.length);

        return {
          id: doc.id,
          highlightedBodyText: highlightedBodyText,
        };
      } else {
        debugLog("\nFailed to find text in body using direct text search");

        // Fallback - try to find just the first sentence of the highlight
        // This handles cases where the highlight spans multiple paragraphs
        const firstSentence = normalizedHighlight.split(/[.!?](\s|$)/)[0];
        if (firstSentence && firstSentence.length > 20) {
          // Only if substantial
          const firstSentenceIndex = normalizedBody.indexOf(firstSentence);
          debugLog("Trying with first sentence:", firstSentence);
          debugLog("First sentence found at index:", firstSentenceIndex);

          if (firstSentenceIndex !== -1) {
            // Return highlighted first sentence with context
            const startPos = Math.max(0, firstSentenceIndex - 150);
            const endPos = Math.min(
              normalizedBody.length,
              firstSentenceIndex + firstSentence.length + 150
            );

            const beforeText = normalizedBody.substring(
              startPos,
              firstSentenceIndex
            );
            const matchedText = normalizedBody.substring(
              firstSentenceIndex,
              firstSentenceIndex + firstSentence.length
            );
            const afterText = normalizedBody.substring(
              firstSentenceIndex + firstSentence.length,
              endPos
            );

            const highlightedBodyText =
              beforeText + "<mark>" + matchedText + "</mark>" + afterText;

            debugLog(
              "\nHighlighting first sentence with context:",
              highlightedBodyText
            );

            return {
              id: doc.id,
              highlightedBodyText: highlightedBodyText,
            };
          }
        }
      }

      // Fallback if regex match fails
      debugLog("Using fallback highlighting");
      return {
        id: doc.id,
        highlightedBodyText: `<mark>${validatedHighlight}</mark>`,
      };
    }

    // If no specific highlight, fall back to keyword highlighting
    debugLog("No validated highlight, falling back to keyword highlighting");
    debugLog("Using keywords:", keywords);

    // Create a regex that matches any of the keywords (case insensitive)
    if (keywords.length > 0) {
      const keywordRegex = new RegExp(`(${keywords.join("|")})`, "gi");
      const keywordHighlightedText = doc.bodyText.replace(
        keywordRegex,
        "<mark>$1</mark>"
      );

      return {
        id: doc.id,
        highlightedBodyText: keywordHighlightedText,
      };
    } else {
      return {
        id: doc.id,
        highlightedBodyText: doc.bodyText,
      };
    }
  });

  // Wait for all highlights to be processed
  const highlights = await Promise.all(highlightPromises);

  // Apply the highlights to the documents
  topRelevantDocuments = topRelevantDocuments.map((doc) => {
    const highlight = highlights.find((h) => h.id === doc.id);
    return {
      ...doc,
      bodyText: highlight ? highlight.highlightedBodyText : doc.bodyText,
    };
  });

  const systemPrompt = `
      You will be provided with a USER QUERY as well as some SUPPORTING
      DOCUMENTS. Use the supporting documents to answer the user's question.

      The SUPPORTING DOCUMENTS are snippets of ${PlanningSearchJurisdictionNames[jurisdiction]} code.
      It's possible that the SUPPORTING DOCUMENTS do not contain the answer,
      and in those cases it's ok to say that you don't have enough information
      to answer the question.
      `;

  const userPrompt = `
      USER QUERY:
      ${searchQuery}

      SUPPORTING DOCUMENTS:
      ${topRelevantDocuments.map((doc) => doc.text).join("\n\n")}
      `;

  const response = await OpenAIClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory
        .map((q) => [
          { role: "user", content: q.question } as const,
          { role: "assistant", content: q.answer } as const,
        ])
        .flat(),
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
  });

  const responseText = response.choices[0].message.content ?? "";

  return {
    responseText: responseText,
    documents: topRelevantDocuments,
  };
}
