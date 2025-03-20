import { OpenAIClient } from "./OpenaiClient";

// prompt is lifted from the CRAG paper, https://arxiv.org/pdf/2401.15884
// note that the authors got better performance from fine-tuning a model
export const evaluateDocumentRelevance = async (
  question: string,
  document: string
): Promise<boolean | null> => {
  const prompt = `
Given a question, does the following document have exact
information to answer the question? Answer yes or no
only.

Question: ${question}
Document: ${document}
Answer:
`;

  const response = await OpenAIClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      // { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  return (
    response.choices[0].message.content
      ?.trim()
      .replace(".", "")
      .toLowerCase() === "yes"
  );
};
