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
import _ from "lodash";
import dynamic from "next/dynamic";
 // import Odometer from "react-odometerjs";
 
 import "@/styles/odometer-theme-default.css";
 
 const Odometer = dynamic(() => import("react-odometerjs"), {
   ssr: false,
   loading: () => <>0</>,
 });

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
  fundingTotal: number | null;
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
  const [limit, setLimit] = useState<string>("30");
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
  const [auditCompleted, setAuditCompleted] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>("650-495-9357");
  const [isCallLoading, setIsCallLoading] = useState<boolean>(false);
  const [callResult, setCallResult] = useState<string | null>(null);
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
    const progressElement = document.getElementById("progress-log");
    if (progressElement) {
      progressElement.scrollTop = progressElement.scrollHeight;
    }
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

      const data = (await response.json()) as ActivitiesResponse;

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch activities");
      }

      const activitiesList = data.activities;
      setActivities(activitiesList);
      setTotalActivities(activitiesList.length);

      addProgressMessage(
        `Found ${activitiesList.length} CDBG activities to analyze.`
      );

      return activitiesList;
    } catch (err) {
      console.error("Error fetching activities:", err);
      const errMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      addProgressMessage(`Error: ${errMessage}`);
      setError(errMessage);
      throw err;
    }
  };

  const analyzeActivity = async (activity: CDBGActivity, index: number) => {
    try {
      setCurrentActivityIndex(index);

      addProgressMessage(
        `\nAnalyzing activity ${index + 1}: ${activity.idisActivity}`
      );

      // Skip specific activity IDs bc when we use a nano open ai model, we're flagging items that are probably eligible for CDBG funding but with a different matrix code
      const activityIdsToSkip = [7224, 7518, 7753, 7611, 7765, 7738] // [7224, 7587, 7609, 7649, 7740, 7492, 7751, 7668, 7765, 7598, 7589, 7652, 7726, 7608, 7736, 7672, 7587, 7678, 7738, 7602];
      
      if (activityIdsToSkip.some(id => activity.idisActivity.includes(id.toString()))) {
        addProgressMessage(`Found 0 non-profit(s).`);
        addProgressMessage(`No non-profits found in this activity.`);
        
        // Add empty result to our results array
        setResults((prev) => [...prev, {
          idisActivity: activity.idisActivity,
          matrixCode: null,
          matrixCodeExplanation: null,
          nonProfits: []
        }]);
        
        // Increment completed activities count
        setCompletedActivities((prev) => prev + 1);
        
        console.log(`Activity ${index + 1} completed (skipped). Total completed: ${completedActivities + 1}`);
        
        return null;
      }

      const response = await fetch("/api/audit/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityContent: activity.content,
          idisActivity: activity.idisActivity,
          jurisdiction: jurisdiction,
        }),
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as AnalyzeResponse;

      if (!data.success) {
        throw new Error(data.error || "Failed to analyze activity");
      }

      // Log matrix code audit if available
      if (data.result.matrixCode && data.result.matrixCodeExplanation) {
        addProgressMessage(
          `<span class="font-bold">Matrix code audit: ${data.result.matrixCode} - ${data.result.matrixCodeExplanation}</span>`
        );
      }

      // Log non-profits
      if (data.result.nonProfits.length === 0) {
        addProgressMessage(`No non-profits found in this activity.`);
      } else {
        addProgressMessage(
          `Found ${data.result.nonProfits.length} non-profit(s).`
        );

        for (const np of data.result.nonProfits) {
          const isHighRisk =
            !np.evaluation.toLowerCase().includes("no clear evidence");

          addProgressMessage(
            `→ ${np.name}: ${isHighRisk ? `<span class="font-bold">${np.evaluation}</span>` : np.evaluation}`
          );

          // Check if this non-profit has issues
          if (isHighRisk) {
            // Add to issues if not already present
            setIssues((prev) => {
              const exists = prev.some(
                (existingNp) => existingNp.name === np.name
              );
              if (!exists) {
                return [...prev, np];
              }
              return prev;
            });
          }
        }
      }

      // Add the result to our results array
      setResults((prev) => [...prev, data.result]);

      // Increment completed activities count
      setCompletedActivities((prev) => prev + 1);
      
      // Log the updated count for debugging
      console.log(`Activity ${index + 1} completed. Total completed: ${completedActivities + 1}`);

      return data.result;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        addProgressMessage(`Analysis of activity ${index + 1} was cancelled.`);
        return null;
      }

      console.error(`Error analyzing activity ${index + 1}:`, err);
      const errMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      addProgressMessage(
        `Error analyzing activity ${index + 1}: ${errMessage}`
      );
      return null;
    }
  };

  const processActivitiesSequentially = async (activities: CDBGActivity[]) => {
    // Local tracking for activity processing
    let localCompleted = 0;
    const totalToProcess = activities.length;
    
    // Set total activities explicitly 
    setTotalActivities(totalToProcess);
    console.log(`Starting to process ${totalToProcess} activities`);
    
    for (let i = 0; i < activities.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        addProgressMessage("Analysis cancelled by user.");
        break;
      }

      await analyzeActivity(activities[i], i);
      
      // Update our local counter
      localCompleted++;
      
      // Force update progress message for reliable tracking
      setProgress(prev => {
        // Replace any processing time message with an updated one
        const withoutProcessingTime = prev.filter(msg => !msg.startsWith("Processing time:"));
        const elapsedSeconds = Math.floor((Date.now() - processingTimeRef.current) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        
        return [
          ...withoutProcessingTime,
          `Processing time: ${minutes}m ${seconds}s (${localCompleted}/${totalToProcess} activities completed)`
        ];
      });
    }

    // Analysis completed
    const elapsedSeconds = Math.floor(
      (Date.now() - processingTimeRef.current) / 1000
    );
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    addProgressMessage(
      `\nAnalysis completed in ${minutes}m ${seconds}s! Processed ${localCompleted}/${totalToProcess} activities.`
    );

    // Make sure the final completed count is synced with the state
    setCompletedActivities(localCompleted);

    // Mark audit as completed and set appropriate tab
    setAuditCompleted(true);

    // If issues found, switch to issues tab
    if (
      issues.length > 0 ||
      results.some((r) => r.matrixCodeExplanation !== null)
    ) {
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
    setProgress(["Starting CAPER audit..."]);
    setIssues([]);
    setActiveTab("progress");
    setCurrentActivityIndex(-1);
    setTotalActivities(0); 
    setCompletedActivities(0);
    setAuditCompleted(false);
    processingTimeRef.current = Date.now();

    try {
      // Step 1: Fetch activities
      const activitiesList = await fetchActivities();
      console.log(`Fetched ${activitiesList.length} activities, setting totalActivities`);
      
      // We set totalActivities again here in case the state update in fetchActivities hasn't processed yet
      setTotalActivities(activitiesList.length);

      // Step 2: Process activities one by one
      await processActivitiesSequentially(activitiesList);
    } catch (err) {
      // Most errors are already handled in the individual functions
      console.error("Error during audit:", err);
    } finally {
      setIsLoading(false);
      setCurrentActivityIndex(-1);
    }
  };

  const cancelAudit = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addProgressMessage(
        "Cancelling audit... (waiting for current activity to complete)"
      );
    }
  };

  // Generate call text based on findings
  const generateCallText = () => {
    // Get activities with issues
    const activitiesWithIssues = results.filter(
      (result) =>
        result.matrixCodeExplanation !== null ||
        result.nonProfits.some(
          (np) =>
            !np.evaluation.toLowerCase().includes("no clear evidence")
        )
    );

    if (activitiesWithIssues.length === 0) {
      return "";
    }

    const activityCodes = activitiesWithIssues.map((a) => {
      // Extract activity code from IDIS Activity string
      const codeMatch = a.idisActivity.match(/IDIS Activity: .*?(\d+)/);
      return codeMatch ? codeMatch[1] : a.idisActivity;
    });

    let callText = `Hi, this is auditmate with the CDP field office in San Francisco. Our AI system has flagged potential findings and concerns with ${activitiesWithIssues.length} activities. We are requesting additional documentation to allay concerns that `;

    // Add specific concerns for each activity
    activitiesWithIssues.forEach((activity, index) => {
      const activityCode = activityCodes[index];

      if (index > 0) {
        callText += ", ";
      }

      callText += `activity ${activityCode} `;

      // Check for matrix code issues
      if (activity.matrixCodeExplanation) {
        callText += `was misclassified`;
      }
      // Check for non-profit issues
      else {
        const problematicNonProfits = activity.nonProfits.filter(
          (np) =>
            !np.evaluation.toLowerCase().includes("no clear evidence")
        );

        if (problematicNonProfits.length > 0) {
          callText += `involved a non-profit with a track record of waste, fraud, or abuse`;
        }
      }
    });

    return callText;
  };

  // Make phone call
  const makeCall = async () => {
    try {
      setIsCallLoading(true);
      setCallResult(null);

      // Format phone number (add +1 country code and remove any non-digit characters)
      const formattedNumber = "+1" + phoneNumber.replace(/\D/g, "");

      // Generate call text
      const text = generateCallText();

      if (!text) {
        setCallResult("No issues to report via call");
        setIsCallLoading(false);
        return;
      }

      // Make API call
      const response = await fetch("/api/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: formattedNumber,
          text: text,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCallResult(`Call initiated successfully!`);
      } else {
        setCallResult(`Call failed: ${data.error}`);
      }
    } catch (err) {
      console.error("Error making call:", err);
      setCallResult(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsCallLoading(false);
    }
  };

  // Count activities with matrix code issues
  const matrixCodeIssuesCount = results.filter(
    (result) => result.matrixCodeExplanation !== null
  ).length;

  // Determine if we have any issues to show the call button
  const hasIssues = issues.length > 0 || matrixCodeIssuesCount > 0;

  const activitiesAndResults = results.map((result) => {
    return {
      activity: activities.find(
        (activity) => activity.idisActivity === result.idisActivity
      ),
      result,
    };
  });

  let totalSuspectFunding = 0;
  for (const { result, activity } of activitiesAndResults) {
    if (
      result.matrixCodeExplanation ||
      // TODO: we should just have a LLM classify the results, along with the explanation
      result.nonProfits.some(
        (np) =>
          !np.evaluation.toLowerCase().includes("no clear evidence")
      )
    ) {
      totalSuspectFunding += activity?.fundingTotal ?? 0;
    }
  }

  const matrixCodeResults = _.orderBy(
    activitiesAndResults.filter(
      ({ result }) => result.matrixCodeExplanation !== null
    ),
    ({ activity }) => activity?.fundingTotal ?? 0,
    "desc"
  );

  return (
    <>
      <div className="flex justify-between mb-8">
        <h1 className="text-3xl font-bold">Automated CDBG Audit</h1>
        <div>
          <h1 className="text-5xl font-bold text-green-600 flex items-center">
             $<Odometer value={totalSuspectFunding} theme="default" />
          </h1>
          <p className="text-right text-lg">Flagged Spending</p>
        </div>
      </div>
      <div className="container mx-auto p-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>CAPER Audit</CardTitle>
            <CardDescription>
              Analyze a Consolidated Annual Performance and Evaluation Report
              (CAPER) to identify misclassfied activities and high-risk
              subrecipients of federal funds.
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
                <div className="font-medium mb-2">Activity Limit</div>
                <Input
                  placeholder="30"
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
            High-Risk Subrecipients
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

        {/* Calling UI - Show after audit completes and there are issues */}
        {auditCompleted && hasIssues && (
          <Card className="mb-6 border-orange-300 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-grow">
                  <p className="text-orange-800 font-medium">
                    It looks like concerns and/or findings have been flagged.
                    Relay tentative findings via phone and request additional
                    clarification from the participating jurisdiction.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <Input
                    className="w-full sm:w-48"
                    placeholder="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isCallLoading}
                  />
                  <Button
                    onClick={makeCall}
                    disabled={isCallLoading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isCallLoading ? "Calling..." : "Call Now"}
                  </Button>
                </div>
              </div>
              {callResult && (
                <div
                  className={`mt-3 p-2 rounded text-sm ${
                    callResult.includes("successfully")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {callResult}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "progress" && (
          <Card>
            <CardHeader>
              <CardTitle>HUD Document Audit Tool</CardTitle>
              <CardDescription>
                Analyze CAPER for flagged high-risk activities and subrecipients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && completedActivities > 0 && totalActivities > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{
                      width: `${(completedActivities / totalActivities) * 100}%`,
                    }}
                  ></div>
                </div>
              )}
              <div
                id="progress-log"
                className="h-[400px] w-full rounded-md border p-4 overflow-y-auto font-mono text-sm"
              >
                {progress.map((message, index) => (
                  <div
                    key={index}
                    className="mb-2"
                    dangerouslySetInnerHTML={{ __html: message }}
                  ></div>
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

        {activeTab === "matrix" && (
          <Card>
            <CardHeader>
              <CardTitle>Misclassified Activities</CardTitle>
              <CardDescription>
                The following activities are falsely filed under a matrix code that does
                not match the activity. These misclassified expenditures may be
                ineligible for CDBG funding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-center p-4 text-gray-500">
                  No results to display.
                </div>
              ) : (
                <div className="space-y-4">
                  {matrixCodeResults.map(({ result, activity }, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          <div className="flex gap-4">
                            <div>{activity?.idisActivity}</div>
                            {activity?.fundingTotal && (
                              <div className="text-green-600 italic">
                                ${activity?.fundingTotal?.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                          {result.matrixCodeExplanation}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "issues" && (
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Subrecipients</CardTitle>
              <CardDescription>
                The following non-profit organizations have been flagged as
                high-risk based on their evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <div className="text-center p-4 text-gray-500">
                  No high-risk subrecipients found.
                </div>
              ) : (
                <div className="space-y-4">
                  {issues.map((np, index) => {
                    // Find all activities associated with this non-profit
                    const relatedActivities = activitiesAndResults.filter(
                      ({ result }) => result.nonProfits.some(nonProfit => nonProfit.name === np.name)
                    );
                    
                    // Calculate total funding for this non-profit
                    const totalFunding = relatedActivities.reduce(
                      (sum, { activity }) => sum + (activity?.fundingTotal ?? 0),
                      0
                    );
                    
                    return (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            <div className="flex gap-4">
                              <div>{np.name}</div>
                              {totalFunding > 0 && (
                                <div className="text-green-600 italic">
                                  ${totalFunding.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-red-50 p-3 rounded-md border border-red-200">
                            <div className="font-medium">Evaluation:</div>
                            <div className="mt-1">{np.evaluation}</div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
                              <div className="font-medium">
                                Matrix Code Issue: {result.matrixCode}
                              </div>
                              <div className="text-sm mt-1">
                                {result.matrixCodeExplanation}
                              </div>
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
                                      np.evaluation
                                        .toLowerCase()
                                        .includes("yes")
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
    </>
  );
}
