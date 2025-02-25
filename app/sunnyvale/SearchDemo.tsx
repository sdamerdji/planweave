"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DocumentsBySearch } from "./documents";

const SearchDemo = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const queries = Object.keys(DocumentsBySearch);

  //   const handleSearch = (e) => {
  // e.preventDefault();
  // if (searchQuery.trim()) {
  //   setSearchPerformed(true);
  // }
  //   };

  const handleQuerySelect = (query: string) => {
    setSearchQuery(query);
    setSearchPerformed(true);
    setIsInputFocused(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto">
        {/* Header */}
        <header className="py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">planweave.ai</h1>
            <div className="flex items-center space-x-4">
              <Button variant="ghost">Documentation</Button>
              <Button variant="ghost">About</Button>
              <Button variant="outline">Login</Button>
            </div>
          </div>
          <p className="mt-2 text-slate-600">
            AI-powered research assistant for urban planners
          </p>
        </header>

        {/* Main content */}
        <div className="flex mt-6">
          {/* Main content area */}
          <div className="flex-1 mr-6">
            {/* Search bar */}
            <form className="relative mb-6">
              <div className="relative">
                <Search
                  style={{ top: ".9rem" }}
                  className="absolute left-3 top-4 h-5 w-5 text-slate-400"
                />
                <Input
                  type="text"
                  placeholder="Search for urban planning information..."
                  value={searchQuery}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => {
                    // Small delay to allow for dropdown item clicks
                    setTimeout(() => setIsInputFocused(false), 200);
                  }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-16 py-6 text-lg w-full border-slate-300"
                />
                <Button
                  type="submit"
                  style={{ top: ".4rem", right: ".4rem" }}
                  className="absolute bg-black hover:bg-gray-700"
                >
                  Search
                </Button>
                {isInputFocused && (
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
                          onClick={() => handleQuerySelect(query)}
                        >
                          <Search className="h-4 w-4 text-slate-400 mr-2" />
                          <span>{query}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </form>

            {/* AI-generated content */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-medium">
                  {searchPerformed
                    ? `Results for "${searchQuery}"`
                    : "Enter a search query to get started"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchPerformed ? (
                  <div className="prose max-w-none">
                    <h2>Mixed-Use Development Guidelines</h2>
                    <p>
                      Based on your search for "{searchQuery}", here are the key
                      zoning considerations for mixed-use developments in urban
                      centers:
                    </p>
                    <p>
                      Mixed-use zoning allows for combination of residential,
                      commercial, cultural, institutional, or industrial uses in
                      a single building or neighborhood. This approach promotes
                      walkability, reduces car dependency, and creates vibrant
                      communities.
                    </p>
                    <h3>Key Considerations:</h3>
                    <ul>
                      <li>
                        Floor Area Ratio (FAR) typically ranges from 2.0 to 6.0
                        depending on the district
                      </li>
                      <li>
                        Height restrictions generally allow 4-8 stories in
                        mid-density areas
                      </li>
                      <li>
                        Setbacks are often minimized to create a stronger street
                        wall
                      </li>
                      <li>
                        Parking requirements are typically reduced by 20-30%
                        compared to single-use developments
                      </li>
                    </ul>
                    <p>
                      Most municipalities require a minimum of 20% affordable
                      housing units for new mixed-use developments exceeding 50
                      total residential units.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Search className="mx-auto h-12 w-12 mb-4 text-slate-400" />
                    <p>
                      Search for information about zoning regulations,
                      development guidelines, community planning, or other urban
                      planning topics.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-6">
            {/* Parcel Information Card */}
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg">Parcel Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {searchPerformed ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500">Zone District</p>
                      <p className="font-medium">Mixed-Use Urban (MU-3)</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Lot Size</p>
                      <p className="font-medium">24,500 sq ft</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Permitted Uses</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge>Residential</Badge>
                        <Badge>Retail</Badge>
                        <Badge>Office</Badge>
                        <Badge>Restaurant</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">
                        Overlay Districts
                      </p>
                      <p className="font-medium">
                        Transit-Oriented Development
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-slate-500">Recent Permits</p>
                      <ul className="mt-1 space-y-1">
                        <li className="text-sm">Building renovation (2023)</li>
                        <li className="text-sm">Sidewalk improvement (2022)</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-2">
                    Parcel details will appear after search
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Sources Card */}
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg">Sources</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {searchPerformed ? (
                  <div className="space-y-3">
                    <div className="p-2 border rounded">
                      <p className="font-medium text-sm">
                        City Zoning Code 2024
                      </p>
                      <p className="text-xs text-slate-500">
                        Section 4.3: Mixed-Use Development
                      </p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="font-medium text-sm">
                        Urban Land Institute
                      </p>
                      <p className="text-xs text-slate-500">
                        Mixed-Use Development Handbook
                      </p>
                    </div>
                    <div className="p-2 border rounded">
                      <p className="font-medium text-sm">
                        City Planning Department
                      </p>
                      <p className="text-xs text-slate-500">
                        Municipal Parcel Database
                      </p>
                    </div>
                    <Separator />
                    <div className="text-xs text-slate-500">
                      <p>Last updated: February 15, 2025</p>
                      <p>Information accuracy: 97% confidence</p>
                    </div>
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
