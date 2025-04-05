import { OpenAIClient } from "./OpenaiClient";

// prompt is lifted from the CRAG paper, https://arxiv.org/pdf/2401.15884
// note that the authors got better performance from fine-tuning a model
export const evaluateDocumentRelevance = async (
  question: string,
  document: string
): Promise<boolean | null> => {
  const systemPrompt = `
You are a sophisticated research analyst. Your users are very invested in getting accurate answers to their questions.

Given a question and a document, determine if the document contains information that is relevant to the question. Partial relevance is still ok, as it might help guide us to the final answer. Answer 'relevant', 'partial', or 'irrelevant'
only.
`;

  const prompt = `
Question: ${question}
Document: ${document}
Answer:
`;

  const response = await OpenAIClient.chat.completions.create({
    model: "gpt-4o", // 4o mini is surprisingly bad at determining document relevance
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: 0,
  });

  const answer = response.choices[0].message.content?.trim().toLowerCase();

  if (answer === "relevant" || answer === "partial") {
    return true;
  } else if (answer === "irrelevant") {
    return false;
  } else {
    console.error(
      `Unexpected response from OpenAI: ${response.choices[0].message.content}`
    );
    console.error("Defaulting to false");
    return false;
  }
};
