"use client";

import React, { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LegistarClientToDisplayName = {
  sunnyvaleca: "Sunnyvale, CA",
  mountainview: "Mountain View, CA",
};

type LegistarClient = keyof typeof LegistarClientToDisplayName;

const asterisksToBold = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
};

const SearchDemo = () => {
  const [legistarClient, setLegistarClient] =
    useState<LegistarClient>("sunnyvaleca");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [searchResults, setSearchResults] =
    useState<SearchLegistarResponse | null>(null);

  const [searchLoading, setSearchLoading] = useState(false);

  const queries = ["What projects are using state density bonus law?"];

  const handleSearch = (query: string) => {
    setSearchLoading(true);
    fetch("/api/searchLegistar", {
      method: "POST",
      body: JSON.stringify({ query, legistarClient }),
    })
      .then((response) => response.json())
      .then((data) => {
        setSearchResults(data);
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
      <div className="container mx-auto px-4">
        {/* Header */}
        <header className="py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Legisearch</h1>
          </div>
          <p className="mt-2 text-slate-600">
            AI-powered search over Legistar agendas, meeting notes, and
            attachments
          </p>
        </header>

        <div className="flex mt-6">
          <div className="flex-1 mr-6">
            {/* Search bar */}
            <div className="flex gap-4 w-full">
              <Select
                defaultValue={"sunnyvaleca"}
                onValueChange={(client: LegistarClient) =>
                  setLegistarClient(client)
                }
              >
                <SelectTrigger className="w-50 h-[50px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LegistarClientToDisplayName).map(
                    ([client, name]) => (
                      <SelectItem key={name} value={client}>
                        {name}
                      </SelectItem>
                    )
                  )}
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
                    placeholder="Search Legistar agendas..."
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
                  {isInputFocused && searchQuery.length === 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white shadow-lg rounded-md border border-slate-200 z-10">
                      <div className="p-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-500">
                          Recent Searches
                        </p>
                      </div>
                      <ul>
                        {queries.map((query, index) => (
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

            {/* AI-generated content */}
            <Card className="shadow-lg">
              <CardHeader className="px-6">
                <CardTitle className="text-xl font-medium">
                  {searchLoading
                    ? "Researching..."
                    : searchResults
                      ? "Answer"
                      : "Enter a search query to get started"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchResults && !searchLoading ? (
                  <div
                    className="prose max-w-none whitespace-pre-line"
                    dangerouslySetInnerHTML={{
                      __html: `<p>${asterisksToBold(searchResults.responseText)}</p>`,
                    }}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    {searchLoading ? (
                      <Loader2 className="animate-spin mx-auto h-12 w-12 mb-4 text-slate-800" />
                    ) : (
                      <Search className="mx-auto h-12 w-12 mb-4 text-slate-400" />
                    )}
                    <p>Search Legistar agendas...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-6">
            {/* Sources Card */}
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg">Sources</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {searchResults ? (
                  <div className="space-y-3 flex flex-col">
                    {searchResults.documents.map((doc, i) => (
                      <a href={doc.url} key={i}>
                        <div className="p-2 border rounded">
                          <p className="font-medium text-sm">{doc.body}</p>
                          <p className="font-medium text-sm">
                            {new Date(doc.dateStr).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {doc.snippet}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-2">
                    Sources will be listed after search
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchDemo;
