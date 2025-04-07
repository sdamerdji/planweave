"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { asterisksToBold } from "@/src/utils";
import { Document, ResponseBody } from "@/app/api/joco/apiTypes";
import { twMerge } from "tailwind-merge";

type QuestionAnswer = {
  searchId: number;
  question: string;
  answer: string;
  documents: Document[];
  feedback: "positive" | "negative" | null;
};

export default function JocoSearchPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchIsFocused, setSearchIsFocused] = useState(false);

  const [conversationHistory, setConversationHistory] = useState<
    QuestionAnswer[]
  >([]);

  const handleSearch = async (searchQuery?: string) => {
    const queryToUse = searchQuery ?? query;
    if (!queryToUse.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/joco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryToUse,
          conversationHistory: conversationHistory.map((q) => ({
            question: q.question,
            answer: q.answer,
            searchId: q.searchId,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data = (await res.json()) as ResponseBody;
      const newQuestionAnswer: QuestionAnswer = {
        question: queryToUse,
        answer: data.responseText,
        documents: data.documents,
        searchId: data.searchId,
        feedback: null,
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

  const handleFeedback = async (
    searchId: number,
    feedback: "positive" | "negative"
  ) => {
    const updatedConversationHistory = conversationHistory.map((q) =>
      q.searchId === searchId ? { ...q, feedback } : q
    );
    setConversationHistory(updatedConversationHistory);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchId,
          feedback,
        }),
      });
    } catch (err) {
      console.error("Error updating feedback:", err);
    }
  };

  return (
    // large padding here to allow for absolute-positioned search bar
    <div className="container mx-auto py-20">
      <div className="flex justify-between mb-8">
        <h1 className="text-xl font-bold">
          Johnson County Zoning Regulation Search
        </h1>
        {conversationHistory.length > 0 && (
          <a href="/joco" target="_blank">
            <Button>
              New search <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        )}
      </div>

      {conversationHistory.length === 0 && (
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search Johnson Zoning Regulations..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                onFocus={() => setSearchIsFocused(true)}
                onBlur={() => setSearchIsFocused(false)}
              />
              <div
                className={twMerge(
                  "absolute left-0 right-0 top-full mt-1 bg-white shadow-lg rounded-md border border-slate-200 z-10",
                  query.length === 0 && searchIsFocused ? "block" : "hidden"
                )}
              >
                <div className="p-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-500">
                    Suggested Searches
                  </p>
                </div>
                <ul onMouseDown={(e) => e.preventDefault()}>
                  {[
                    "What are the key differences between RN-1 and RN-2 zoning?",
                    "What is the insurance rate map?",
                    "What are the requirements for home-based businesses?",
                  ].map((suggestion, index) => (
                    <li
                      key={index}
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer"
                      onMouseDown={() => {
                        setQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                    >
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button onClick={() => handleSearch()} disabled={isLoading}>
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
              <div className="flex gap-4 mt-4">
                <ThumbsUp
                  className={`w-5 h-5 cursor-pointer hover:text-green-500 ${
                    questionAnswer.feedback === "positive"
                      ? "text-green-500"
                      : ""
                  }`}
                  onClick={() =>
                    handleFeedback(questionAnswer.searchId, "positive")
                  }
                />
                <ThumbsDown
                  className={`w-5 h-5 cursor-pointer hover:text-red-500 ${
                    questionAnswer.feedback === "negative" ? "text-red-500" : ""
                  }`}
                  onClick={() =>
                    handleFeedback(questionAnswer.searchId, "negative")
                  }
                />
              </div>
            </div>

            {questionAnswer.documents.length > 0 && (
              <div className="basis-1/2">
                <h2 className="text-xl font-semibold mb-4">Code citations</h2>
                <div className="space-y-4">
                  {questionAnswer.documents.map((doc, index) => {
                    const highlightedBodyText =
                      doc.bodyText.match(/<mark>(.*?)<\/mark>/)?.[1];
                    console.log(highlightedBodyText);
                    return (
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
                            {highlightedBodyText && (
                              <a
                                href={`/pdf-viewer?url=${encodeURIComponent(doc.pdfUrl)}&s=${encodeURIComponent(highlightedBodyText)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                Highlight in PDF
                              </a>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
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
            <Button onClick={() => handleSearch()} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Ask"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
