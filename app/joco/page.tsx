"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { asterisksToBold } from "@/src/utils";
import { Document, ResponseBody } from "@/app/api/joco/apiTypes";

type QuestionAnswer = {
  question: string;
  answer: string;
  documents: Document[];
};

export default function JocoSearchPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [conversationHistory, setConversationHistory] = useState<
    QuestionAnswer[]
  >([]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/joco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          conversationHistory: conversationHistory.map((q) => ({
            question: q.question,
            answer: q.answer,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data = (await res.json()) as ResponseBody;
      const newQuestionAnswer: QuestionAnswer = {
        question: query,
        answer: data.responseText,
        documents: data.documents,
      };
      setConversationHistory([...conversationHistory, newQuestionAnswer]);
      setQuery("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    // large padding here to allow for absolute-positioned search bar
    <div className="container mx-auto py-20">
      <h1 className="text-xl font-bold mb-6">
        Johnson County Zoning Regulation Search
      </h1>

      {conversationHistory.length === 0 && (
        <div className="flex gap-2 mb-8">
          <Input
            placeholder="Search Johnson Zoning Regulations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {conversationHistory.map((questionAnswer, index) => (
        <div key={index}>
          <h1 className="text-3xl font-semibold mb-12 mt-12">
            {questionAnswer.question}
            {questionAnswer.question[questionAnswer.question.length - 1] === "?"
              ? ""
              : "?"}
          </h1>
          <div className="flex gap-12">
            <div className="basis-1/2">
              <p
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: asterisksToBold(questionAnswer.answer),
                }}
              />
            </div>

            {questionAnswer.documents.length > 0 && (
              <div className="basis-1/2">
                <h2 className="text-xl font-semibold mb-4">Code citations</h2>
                <div className="space-y-4">
                  {questionAnswer.documents.map((doc, index) => (
                    <Card key={doc.id}>
                      <div className="p-4 space-y-4">
                        <div>
                          <div className="text-lg font-semibold">
                            {doc.pdfTitle}
                          </div>
                          <div className="text-sm text-gray-500">
                            {doc.headingText}
                          </div>
                        </div>
                        <p
                          className="whitespace-pre-wrap line-clamp-[12]"
                          dangerouslySetInnerHTML={{ __html: doc.bodyText }}
                        />
                        <div>
                          <a
                            href={doc.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline mr-4"
                          >
                            View PDF
                          </a>
                          <a
                            href={`/pdf-viewer?url=${encodeURIComponent(doc.pdfUrl)}&s=${encodeURIComponent(doc.bodyText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            Highlight in PDF
                          </a>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      {conversationHistory.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
          <div className="container mx-auto flex gap-2">
            <Input
              placeholder="Ask a follow-up question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Ask"
              )}
            </Button>
            <a href="/joco" target="_blank">
              <Button>New search</Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
