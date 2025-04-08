import { processRAGQuery } from "../../app/api/codeSearch/processRagQuery";
import { evalCases } from "./EvalCases";
import { OpenAIClient } from "../../src/OpenaiClient";

async function evaluateResponse(
  query: string,
  expectedAnswerContent: string,
  actualResponse: string
): Promise<boolean> {
  const systemPrompt = `
    You are an expert evaluator of RAG (Retrieval Augmented Generation)
    responses.  Your task is to evaluate if the actual response correctly
    answers the query based on the expected answer content. The actual answer
    doesn't need to match the expected answer content in format or length; it
    just needs to have the expected content somewhere.
    
    Respond with only either "PASS" or "FAIL" and nothing else.
  `;

  const userPrompt = `
    Query: ${query}
    
    Expected answer content: ${expectedAnswerContent}
    
    Actual response: ${actualResponse}
    
    Respond with either "PASS" or "FAIL" followed by a brief explanation.
  `;

  const response = await OpenAIClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
  });

  const passed =
    response.choices[0].message.content?.trim().toUpperCase() === "PASS";

  return passed;
}

async function runTests() {
  console.log("Starting RAG evaluation tests...\n");

  let testCount = 0;
  let failedTests = 0;

  for (const testCase of evalCases) {
    try {
      process.stdout.write(`${testCase.query} `);
      const result = await processRAGQuery(
        testCase.query,
        [],
        "johnson_county_ks"
      );
      const passed = await evaluateResponse(
        testCase.query,
        testCase.answerContent,
        result.responseText
      );

      if (!passed) {
        failedTests++;
        console.log("❌");
        console.log("Expected content:", testCase.answerContent);
        console.log("Actual response:", result.responseText);
      } else {
        console.log("✅");
      }

      testCount++;
    } catch (error) {
      console.error("Error running test:", error);
    }
  }

  if (testCount > 0) {
    console.log(`\nTest Summary:`);
    console.log(`Total Tests Run: ${testCount}`);
    console.log(`Failed Tests: ${failedTests}`);
  }
}

// Run the tests
runTests().catch(console.error);
