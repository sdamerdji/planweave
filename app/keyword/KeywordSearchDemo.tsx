"use client";

import React, { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DateFilterOptions = {
  all: "All time",
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  "180": "Last 180 days",
  "365": "Last year",
};

type DateFilter = keyof typeof DateFilterOptions;

interface SearchResult {
  id: string;
  body: string;
  dateStr: string;
  content: string;
  url: string;
  client: string;
  summary?: string;
}

interface SearchResponse {
  responseText: string;
  documents: SearchResult[];
}

const KeywordSearchDemo = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(
    null
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [processingSummaries, setProcessingSummaries] = useState(false);
  const { toast } = useToast();

  const exampleQueries = [
    "Housing Element",
    "Annual Progress Report",
    "AFFH",
    "RHNA",
  ];

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      toast({
        title: "What do you want to know?",
        description: "Please enter a search query to get started.",
      });
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    fetch("/api/keywordSearchLegistar", {
      method: "POST",
      body: JSON.stringify({ query, dateFilter }),
    })
      .then((response) => response.json())
      .then((data) => {
        setSearchResults(data);
        setProcessingSummaries(true);
        
        // Process summaries for each document
        const summaryPromises = data.documents.map(async (doc: SearchResult) => {
          try {
            const response = await fetch("/api/summarizeDocument", {
              method: "POST",
              body: JSON.stringify({ content: doc.content, keywords: query }),
            });
            
            const result = await response.json();
            return { id: doc.id, summary: result.summary };
          } catch (error) {
            console.error("Error fetching summary:", error);
            return { id: doc.id, summary: null };
          }
        });
        
        // Once all summaries are processed, update the search results
        Promise.all(summaryPromises)
          .then((summaries) => {
            const updatedDocuments = data.documents.map((doc: SearchResult) => {
              const docSummary = summaries.find((sum) => sum.id === doc.id);
              return {
                ...doc,
                summary: docSummary?.summary || "No summary available.",
              };
            });
            
            setSearchResults({ ...data, documents: updatedDocuments });
            setProcessingSummaries(false);
          })
          .catch((error) => {
            console.error("Error processing summaries:", error);
            setProcessingSummaries(false);
          });
          
        setSearchLoading(false);
      });
  };

  const handleRecentQuerySelect = (query: string) => {
    setSearchQuery(query);
    setIsInputFocused(false);
    handleSearch(query);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster />
      <div className="container mx-auto px-4">
        {/* Header */}
        <header className="py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">
              Keyword Search
            </h1>
          </div>
          <p className="mt-2 text-slate-600">
            Fast keyword search across all city agendas and meeting documents
          </p>
        </header>

        <div className="flex mt-6">
          <div className="flex-1 mr-6">
            {/* Search bar */}
            <div className="flex gap-4 w-full">
              <Select
                defaultValue="all"
                onValueChange={(filter: DateFilter) => setDateFilter(filter)}
              >
                <SelectTrigger className="w-50 h-[50px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DateFilterOptions).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative mb-6 grow">
                <div className="relative">
                  <Search
                    style={{ top: ".9rem" }}
                    className="absolute left-3 top-4 h-5 w-5 text-slate-400"
                  />
                  <Input
                    type="text"
                    placeholder="Enter keywords to search..."
                    value={searchQuery}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => {
                      // Small delay to allow for dropdown item clicks
                      setTimeout(() => setIsInputFocused(false), 100);
                    }}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-16 py-6 text-lg w-full border-slate-300"
                    // Pressing enter triggers search
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch(searchQuery);
                      }
                    }}
                  />
                  <Button
                    style={{ top: ".4rem", right: ".4rem" }}
                    className="absolute bg-black hover:bg-gray-700"
                    onClick={() => handleSearch(searchQuery)}
                  >
                    Search
                  </Button>
                  {(isInputFocused && searchQuery.length === 0) && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white shadow-lg rounded-md border border-slate-200 z-10">
                      <div className="p-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-500">
                          Example Searches
                        </p>
                      </div>
                      <ul>
                        {exampleQueries.map((query, index) => (
                          <li
                            key={index}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center"
                            onClick={() => handleRecentQuerySelect(query)}
                          >
                            <Search className="h-4 w-4 text-slate-400 mr-2" />
                            <span>{query}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search results */}
            <Card className="shadow-lg">
              <CardHeader className="px-6">
                <CardTitle className="text-xl font-medium">
                  {searchLoading
                    ? "Searching..."
                    : searchResults
                      ? "Results"
                      : "Enter keywords to search"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchResults && !searchLoading ? (
                  <div className="space-y-6">
                    {processingSummaries && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="animate-spin h-6 w-6 mr-2 text-slate-800" />
                        <p>Generating summaries...</p>
                      </div>
                    )}
                    {searchResults.documents.map((doc, index) => (
                      <div
                        key={doc.id}
                        className="border-b border-slate-200 pb-6 last:border-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-medium text-slate-900">
                            {`${doc.client} • ${doc.body} • ${new Date(doc.dateStr).toLocaleDateString()}`}
                          </h3>
                        </div>
                        <p
                          className="text-slate-700 whitespace-pre-line"
                          dangerouslySetInnerHTML={{
                            __html: doc.summary || doc.content,
                          }}
                        />
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                        >
                          View original document →
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    {searchLoading ? (
                      <Loader2 className="animate-spin mx-auto h-12 w-12 mb-4 text-slate-800" />
                    ) : (
                      <Search className="mx-auto h-12 w-12 mb-4 text-slate-400" />
                    )}
                    <p>Enter keywords to search across all city documents...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeywordSearchDemo;
