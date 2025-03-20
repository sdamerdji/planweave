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
/// any updates on housing element program implementation? draw attention to any updates on programs to affirmatively further fair housing, to rezone the city per the housing element obligations, anything to do with a "site inventory" from the housing element, or actions tied to 'constraints reduction' 
// New interface for search results by city
interface CitySearchResult {
  city: LegistarClient;
  displayName: string;
  results: SearchLegistarResponse;
  mostRecentDate: Date;
}

const asterisksToBold = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
};

const SearchDemo = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [searchResults, setSearchResults] =
    useState<SearchLegistarResponse | null>(null);
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentSearchState, setCurrentSearchState] = useState<
    "idle" | "searching" | "complete"
  >("idle");

  const queries = ["What projects are using state density bonus law?"];

  // Helper function to get time label and color
  const getTimeLabel = (date: Date) => {
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    
    if (date > oneWeekAgo) {
      return { label: "This week", color: "bg-green-100 text-green-800" };
    } else if (date > oneMonthAgo) {
      return { label: "This month", color: "bg-blue-100 text-blue-800" };
    } else if (date > oneYearAgo) {
      return { label: "This year", color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { label: "Older", color: "bg-gray-100 text-gray-800" };
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setSearchLoading(true);
    setCurrentSearchState("searching");
    setCityResults([]);
    
    // Create an array of city search promises
    const cityPromises = Object.entries(LegistarClientToDisplayName).map(
      async ([client, displayName]) => {
        try {
          const response = await fetch("/api/searchLegistar", {
            method: "POST",
            body: JSON.stringify({ 
              query, 
              legistarClient: client 
            }),
          });
          
          const data: SearchLegistarResponse = await response.json();
          console.log(data.documents);

          console.log(data);

          // Sort documents by date (newest first)
          const sortedDocuments = [...data.documents].sort((a, b) => {
            return new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime();
          });
          
          // Replace documents with sorted array
          data.documents = sortedDocuments;
          
          // Find most recent document date
          const mostRecentDate = data.documents.length > 0 
            ? new Date(data.documents[0].dateStr) // Now we can use the first document since they're sorted
            : new Date(0);
            
          return {
            city: client as LegistarClient,
            displayName: displayName,
            results: data,
            mostRecentDate
          };
        } catch (error) {
          console.error(`Error searching ${displayName}:`, error);
          return null;
        }
      }
    );
    
    // Wait for all searches to complete
    const results = (await Promise.all(cityPromises)).filter(
      (result): result is CitySearchResult => result !== null
    );
    
    // Sort cities by most recent document date
    const sortedResults = results.sort(
      (a, b) => b.mostRecentDate.getTime() - a.mostRecentDate.getTime()
    );
    
    setCityResults(sortedResults);
    setSearchLoading(false);
    setCurrentSearchState("complete");
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
              <div className="relative mb-6 grow">
                <div className="relative">
                  <Search
                    style={{ top: ".9rem" }}
                    className="absolute left-3 top-4 h-5 w-5 text-slate-400"
                  />
                  <Input
                    type="text"
                    placeholder="Search across all cities..."
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

            {/* Main content area - Search results by city */}
            {currentSearchState === "searching" ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto h-12 w-12 mb-4 text-slate-800" />
                <p className="text-slate-600">Searching across all cities...</p>
              </div>
            ) : currentSearchState === "complete" ? (
              <div className="space-y-8">
                {cityResults.length > 0 ? (
                  cityResults.map((cityResult, index) => (
                    <Card key={index} className="shadow-lg">
                      <CardHeader className="px-6 bg-slate-50">
                        <CardTitle className="text-xl font-medium flex justify-between items-center">
                          <span>{cityResult.displayName}</span>
                          <Badge variant="outline">
                            {cityResult.mostRecentDate.toLocaleDateString()}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div
                          className="prose max-w-none whitespace-pre-line"
                          dangerouslySetInnerHTML={{
                            __html: `<p>${asterisksToBold(
                              cityResult.results.responseText
                            )}</p>`,
                          }}
                        />
                        <Separator className="my-4" />
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-slate-700">Sources:</h4>
                          {cityResult.results.documents.map((doc, i) => (
                            <a href={doc.url} key={i} className="block">
                              <div className="p-2 border rounded hover:bg-slate-50">
                                <p className="font-medium text-sm">{doc.body}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(doc.dateStr).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {doc.snippet}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="shadow-lg">
                    <CardContent className="p-6 text-center">
                      <p className="text-slate-600 py-8">No results found for your search query.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="shadow-lg">
                <CardHeader className="px-6">
                  <CardTitle className="text-xl font-medium">
                    Enter a search query to get started
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-slate-500">
                    <Search className="mx-auto h-12 w-12 mb-4 text-slate-400" />
                    <p>Search across all cities at once...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-6">
            {/* Search Summary */}
            {currentSearchState === "complete" && cityResults.length > 0 && (
              <Card>
                <CardHeader className="bg-slate-50 border-b">
                  <CardTitle className="text-lg">Cities Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ul className="space-y-3">
                    {cityResults.map((city, i) => {
                      const timeInfo = getTimeLabel(city.mostRecentDate);
                      return (
                        <li key={i} className="text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{city.displayName}</span>
                            <Badge variant="secondary">
                              {city.results.documents.length} docs
                            </Badge>
                          </div>
                          <div className="flex items-center">
                            <span className={`text-xs px-2 py-1 rounded-full ${timeInfo.color}`}>
                              {timeInfo.label}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">
                              {city.mostRecentDate.toLocaleDateString()}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchDemo;
