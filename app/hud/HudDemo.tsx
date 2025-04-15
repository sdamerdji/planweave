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

interface CDBGActivity {
  id: string;
  idisActivity: string;
  content: string;
}

interface ActivitiesResponse {
  success: boolean;
  jurisdiction: string;
  limit: number | string;
  totalActivities: number;
  activities: CDBGActivity[];
  error?: string;
}

interface AnalyzeResponse {
  success: boolean;
  result: AuditResult;
  error?: string;
}

export default function HudDemo() {
  const [jurisdiction, setJurisdiction] = useState<string>("san_diego_ca");
  const [limit, setLimit] = useState<string>("10");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activities, setActivities] = useState<CDBGActivity[]>([]);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<number, boolean>
  >({});
  const [progress, setProgress] = useState<string[]>([]);
  const [issues, setIssues] = useState<NonProfit[]>([]);
  const [activeTab, setActiveTab] = useState<string>("progress");
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(-1);
  const [totalActivities, setTotalActivities] = useState<number>(0);
  const [completedActivities, setCompletedActivities] = useState<number>(0);
  const processingTimeRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup polling interval and abort controller on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const addProgressMessage = (message: string) => {
    setProgress((prev) => [...prev, message]);
    // Scroll to bottom of progress log
    const progressElement = document.getElementById('progress-log');
    if (progressElement) {
      progressElement.scrollTop = progressElement.scrollHeight;
    }
  };

  const updateProcessingTime = () => {
    const elapsedSeconds = Math.floor((Date.now() - processingTimeRef.current) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    setProgress((prev) => {
      const withoutLastTime = prev.filter(msg => !msg.startsWith("Processing time:"));
      return [...withoutLastTime, `Processing time: ${minutes}m ${seconds}s (${completedActivities}/${totalActivities} activities completed)`];
    });
  };

  const fetchActivities = async () => {
    try {
      const limitVal = parseInt(limit);
      const url = `/api/audit/activities?jurisdiction=${encodeURIComponent(jurisdiction)}${
        !isNaN(limitVal) ? `&limit=${limitVal}` : ""
      }`;

      addProgressMessage(`Fetching CDBG activities from: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as ActivitiesResponse;
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch activities");
      }
      
      setActivities(data.activities);
      setTotalActivities(data.activities.length);
      
      addProgressMessage(`Found ${data.activities.length} CDBG activities to analyze.`);
      
      return data.activities;
    } catch (err) {
      console.error("Error fetching activities:", err);
      const errMessage = err instanceof Error ? err.message : "An unknown error occurred";
      addProgressMessage(`Error: ${errMessage}`);
      setError(errMessage);
      throw err;
    }
  };

  const analyzeActivity = async (activity: CDBGActivity, index: number) => {
    try {
      setCurrentActivityIndex(index);
      
      addProgressMessage(`\nAnalyzing activity ${index + 1}/${totalActivities}: ${activity.idisActivity}`);
      
      const response = await fetch('/api/audit/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityContent: activity.content,
          idisActivity: activity.idisActivity,
          jurisdiction: jurisdiction
        }),
        signal: abortControllerRef.current?.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as AnalyzeResponse;
      
      if (!data.success) {
        throw new Error(data.error || "Failed to analyze activity");
      }

      // Log matrix code audit if available
      if (data.result.matrixCode && data.result.matrixCodeExplanation) {
        addProgressMessage(`Matrix code audit: ${data.result.matrixCode} - ${data.result.matrixCodeExplanation}`);
      }
      
      // Log non-profits
      if (data.result.nonProfits.length === 0) {
        addProgressMessage(`No non-profits found in this activity.`);
      } else {
        addProgressMessage(`Found ${data.result.nonProfits.length} non-profit(s).`);
        
        for (const np of data.result.nonProfits) {
          addProgressMessage(`→ ${np.name}: ${np.evaluation}`);
          
          // Check if this non-profit has issues
          if (
            np.evaluation.toLowerCase().includes("yes") ||
            (np.evaluation.toLowerCase().includes("evidence") &&
              !np.evaluation.toLowerCase().includes("no clear evidence"))
          ) {
            // Add to issues if not already present
            setIssues(prev => {
              const exists = prev.some(existingNp => existingNp.name === np.name);
              if (!exists) {
                return [...prev, np];
              }
              return prev;
            });
          }
        }
      }
      
      // Add the result to our results array
      setResults(prev => [...prev, data.result]);
      
      // Mark as completed
      setCompletedActivities(prev => prev + 1);
      
      return data.result;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        addProgressMessage(`Analysis of activity ${index + 1} was cancelled.`);
        return null;
      }
      
      console.error(`Error analyzing activity ${index + 1}:`, err);
      const errMessage = err instanceof Error ? err.message : "An unknown error occurred";
      addProgressMessage(`Error analyzing activity ${index + 1}: ${errMessage}`);
      return null;
    }
  };

  const processActivitiesSequentially = async (activities: CDBGActivity[]) => {
    for (let i = 0; i < activities.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        addProgressMessage("Analysis cancelled by user.");
        break;
      }
      
      await analyzeActivity(activities[i], i);
      updateProcessingTime();
    }
    
    // Analysis completed
    const elapsedSeconds = Math.floor((Date.now() - processingTimeRef.current) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    addProgressMessage(`\nAnalysis completed in ${minutes}m ${seconds}s! Processed ${completedActivities}/${totalActivities} activities.`);
    
    // If issues found, switch to issues tab
    if (issues.length > 0) {
      setActiveTab("issues");
    }
  };

  const startAudit = async () => {
    // Clean up any existing polling and abort controllers
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setActivities([]);
    setResults([]);
    setError(null);
    setProgress(["Starting HUD document audit..."]);
    setIssues([]);
    setActiveTab("progress");
    setCurrentActivityIndex(-1);
    setTotalActivities(0);
    setCompletedActivities(0);
    processingTimeRef.current = Date.now();

    try {
      // Start polling for processing time updates
      pollingIntervalRef.current = setInterval(() => {
        updateProcessingTime();
      }, 1000);
      
      // Step 1: Fetch activities
      const activitiesList = await fetchActivities();
      
      // Step 2: Process activities one by one
      await processActivitiesSequentially(activitiesList);
      
    } catch (err) {
      // Most errors are already handled in the individual functions
      console.error("Error during audit:", err);
    } finally {
      setIsLoading(false);
      setCurrentActivityIndex(-1);
      
      // Clear the polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  const cancelAudit = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addProgressMessage("Cancelling audit... (waiting for current activity to complete)");
    }
  };

  // Count activities with matrix code issues
  const matrixCodeIssuesCount = results.filter(
    result => result.matrixCodeExplanation !== null
  ).length;

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
              {isLoading ? (
                <Button
                  className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
                  onClick={cancelAudit}
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  className="w-full sm:w-auto"
                  onClick={startAudit}
                  disabled={isLoading}
                >
                  Start Audit
                </Button>
              )}
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
          className={`px-4 py-2 flex items-center ${
            activeTab === "matrix"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("matrix")}
        >
          Ineligible Activities
          {matrixCodeIssuesCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {matrixCodeIssuesCount}
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
            {isLoading && completedActivities > 0 && totalActivities > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${(completedActivities / totalActivities) * 100}%` }}
                ></div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div id="progress-log" className="h-[400px] w-full rounded-md border p-4 overflow-y-auto font-mono text-sm">
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
            {results.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                No results to display.
              </div>
            ) : (
              <div className="space-y-4">
                {results
                  .filter((result) => result.matrixCodeExplanation !== null)
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
                {results.filter(
                  (result) => result.matrixCodeExplanation !== null
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
              Found {results.length} activity results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                No results to display.
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result, index) => (
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
                        {result.matrixCodeExplanation && (
                          <div className="mb-3 p-2 rounded-md bg-amber-50 border border-amber-200">
                            <div className="font-medium">Matrix Code Issue: {result.matrixCode}</div>
                            <div className="text-sm mt-1">{result.matrixCodeExplanation}</div>
                          </div>
                        )}
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
