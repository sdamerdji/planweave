"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface NonProfit {
  name: string;
  evaluation: string;
}

interface AuditResult {
  idisActivity: string;
  matrixCode: string | null;
  matrixCodeExplanation: string | null;
  nonProfits: NonProfit[];
}

interface AuditResponse {
  success: boolean;
  jurisdiction: string;
  limit: number | string;
  total: number;
  results: AuditResult[];
  error?: string;
}

export default function HudDemo() {
  const [jurisdiction, setJurisdiction] = useState<string>("san_diego_ca");
  const [limit, setLimit] = useState<string>("10");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<number, boolean>
  >({});
  const [progress, setProgress] = useState<string[]>([]);
  const [issues, setIssues] = useState<NonProfit[]>([]);
  const [activeTab, setActiveTab] = useState<string>("progress");
  const processingTimeRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const startAudit = async () => {
    // Clean up any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setIsLoading(true);
    setResults(null);
    setError(null);
    setProgress(["Starting HUD document audit..."]);
    setIssues([]);
    setActiveTab("progress");
    processingTimeRef.current = 0;

    try {
      const limitVal = parseInt(limit);
      const url = `/api/audit?jurisdiction=${encodeURIComponent(jurisdiction)}${
        !isNaN(limitVal) ? `&limit=${limitVal}` : ""
      }`;

      setProgress((prev) => [...prev, `Sending request to: ${url}`]);

      // Start a timer to track processing time
      const startTime = Date.now();
      processingTimeRef.current = startTime;

      // Start a polling interval to update processing time
      pollingIntervalRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor(
          (Date.now() - processingTimeRef.current) / 1000
        );
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        setProgress((prev) => {
          const withoutLastTime = prev.filter(
            (msg) => !msg.startsWith("Processing time:")
          );
          return [
            ...withoutLastTime,
            `Processing time: ${minutes}m ${seconds}s`,
          ];
        });
      }, 1000);

      const response = await fetch(url);

      // Clear the polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);

      // Find organizations with issues
      if (data.results) {
        const nonProfitsWithIssues = data.results
          .flatMap((result: AuditResult) => result.nonProfits)
          .filter(
            (np: NonProfit) =>
              np.evaluation.toLowerCase().includes("yes") ||
              (np.evaluation.toLowerCase().includes("evidence") &&
                !np.evaluation.toLowerCase().includes("no clear evidence"))
          );

        setIssues(nonProfitsWithIssues);

        if (nonProfitsWithIssues.length > 0) {
          setActiveTab("issues");
        }
      }

      // Calculate total time
      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(totalTime / 60);
      const seconds = totalTime % 60;

      setProgress((prev) => [
        ...prev.filter((msg) => !msg.startsWith("Processing time:")),
        `Audit completed in ${minutes}m ${seconds}s! Processed ${data.total} project sections.`,
      ]);
    } catch (err) {
      // Clear the polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      console.error("Error during audit:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setProgress((prev) => [
        ...prev.filter((msg) => !msg.startsWith("Processing time:")),
        `Error: ${
          err instanceof Error ? err.message : "An unknown error occurred"
        }`,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>HUD Document Audit Tool</CardTitle>
          <CardDescription>
            Analyze HUD CDBG fund reports to identify non-profit organizations
            and evaluate them based on news coverage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <div className="flex-1">
              <div className="font-medium mb-2">Jurisdiction</div>
              <Input
                placeholder="san_diego_ca"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="w-32">
              <div className="font-medium mb-2">Project Limit</div>
              <Input
                placeholder="10"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full sm:w-auto"
                onClick={startAudit}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Start Audit"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          <div className="font-bold">Error</div>
          <div>{error}</div>
        </div>
      )}

      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 ${
            activeTab === "progress"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("progress")}
        >
          Progress Log
        </button>
        <button
          className={`px-4 py-2 flex items-center ${
            activeTab === "issues"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("issues")}
        >
          Issues Found
          {issues.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {issues.length}
            </Badge>
          )}
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "matrix"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("matrix")}
        >
          Ineligible Activities
          {results?.results.filter((result) => result.matrixCodeExplanation)
            .length && (
            <Badge variant="destructive" className="ml-2">
              {
                results?.results.filter(
                  (result) => result.matrixCodeExplanation
                ).length
              }
            </Badge>
          )}
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "results"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("results")}
        >
          All Results
        </button>
      </div>

      {activeTab === "progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full rounded-md border p-4 overflow-y-auto">
              {progress.map((message, index) => (
                <div key={index} className="mb-2">
                  {message}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                  Processing...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "issues" && (
        <Card>
          <CardHeader>
            <CardTitle>Organizations with Potential Issues</CardTitle>
            <CardDescription>
              The following organizations were flagged based on news coverage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                No issues found.
              </div>
            ) : (
              <div className="space-y-4">
                {issues.map((np, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{np.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                        {np.evaluation}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "matrix" && (
        <Card>
          <CardHeader>
            <CardTitle>Potentially Ineligible Activities</CardTitle>
            <CardDescription>
              The following activities are filed under a matrix code that does
              not match the activity. These could be misclassified or possibly
              totally ineligible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!results ? (
              <div className="text-center p-4 text-gray-500">
                No results to display.
              </div>
            ) : (
              <div className="space-y-4">
                {results.results
                  .filter((result) => result.matrixCodeExplanation)
                  .map((result, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {result.idisActivity}
                        </CardTitle>
                        <div className="text-sm text-gray-500">
                          Matrix Code: {result.matrixCode}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                          {result.matrixCodeExplanation}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {results.results.filter(
                  (result) => result.matrixCodeExplanation
                ).length === 0 && (
                  <div className="text-center p-4 text-gray-500">
                    No matrix code issues found.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "results" && (
        <Card>
          <CardHeader>
            <CardTitle>All Results</CardTitle>
            <CardDescription>
              Found {results?.total || 0} project sections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!results ? (
              <div className="text-center p-4 text-gray-500">
                No results to display.
              </div>
            ) : (
              <div className="space-y-2">
                {results.results.map((result, index) => (
                  <Card key={index}>
                    <CardHeader
                      className="cursor-pointer flex flex-row items-center justify-between"
                      onClick={() => toggleSection(index)}
                    >
                      <CardTitle className="text-sm">
                        {result.idisActivity}
                      </CardTitle>
                      <div className="flex items-center">
                        {result.nonProfits.length > 0 && (
                          <Badge className="mr-2">
                            {result.nonProfits.length} org
                            {result.nonProfits.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        <span className="text-xs">
                          {expandedSections[index] ? "▲" : "▼"}
                        </span>
                      </div>
                    </CardHeader>
                    {expandedSections[index] && (
                      <CardContent>
                        {result.nonProfits.length === 0 ? (
                          <div className="text-gray-500">
                            No non-profits identified
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {result.nonProfits.map((np, npIndex) => (
                              <div
                                key={npIndex}
                                className="p-2 rounded-md bg-gray-50"
                              >
                                <div className="font-medium">{np.name}</div>
                                <div
                                  className={`mt-1 p-2 rounded text-sm ${
                                    np.evaluation.toLowerCase().includes("yes")
                                      ? "bg-red-50 border border-red-200"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  {np.evaluation}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
