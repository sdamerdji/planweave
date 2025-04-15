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

  const updateProcessingTime = () => {
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
        `Processing time: ${minutes}m ${seconds}s (${completedActivities}/${totalActivities} activities completed)`,
      ];
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

      const data = (await response.json()) as ActivitiesResponse;

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch activities");
      }

      setActivities(data.activities);
      setTotalActivities(data.activities.length);

      addProgressMessage(
        `Found ${data.activities.length} CDBG activities to analyze.`
      );

      return data.activities;
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
        `\nAnalyzing activity ${index + 1}/${totalActivities}: ${activity.idisActivity}`
      );

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
            np.evaluation.toLowerCase().includes("yes") ||
            (np.evaluation.toLowerCase().includes("evidence") &&
              !np.evaluation.toLowerCase().includes("no clear evidence"));

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

      // Mark as completed
      setCompletedActivities((prev) => prev + 1);

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
    for (let i = 0; i < activities.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        addProgressMessage("Analysis cancelled by user.");
        break;
      }

      await analyzeActivity(activities[i], i);
      updateProcessingTime();
    }

    // Analysis completed
    const elapsedSeconds = Math.floor(
      (Date.now() - processingTimeRef.current) / 1000
    );
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    addProgressMessage(
      `\nAnalysis completed in ${minutes}m ${seconds}s! Processed ${completedActivities}/${totalActivities} activities.`
    );

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
            np.evaluation.toLowerCase().includes("yes") ||
            (np.evaluation.toLowerCase().includes("evidence") &&
              !np.evaluation.toLowerCase().includes("no clear evidence"))
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

    let callText = `Hi, this is auditmate with the CDP field office in Los Angeles. Our AI system has flagged potential findings and concerns with activities ${activityCodes.join(", ")}, and we are requesting additional documentation to allay concerns that `;

    // Add specific concerns for each activity
    activitiesWithIssues.forEach((activity, index) => {
      const activityCode = activityCodes[index];

      if (index > 0) {
        callText += ", ";
      }

      callText += `activity ${activityCode} does not `;

      // Check for matrix code issues
      if (activity.matrixCodeExplanation) {
        callText += `have the correct matrix code`;
      }
      // Check for non-profit issues
      else {
        const problematicNonProfits = activity.nonProfits.filter(
          (np) =>
            np.evaluation.toLowerCase().includes("yes") ||
            (np.evaluation.toLowerCase().includes("evidence") &&
              !np.evaluation.toLowerCase().includes("no clear evidence"))
        );

        if (problematicNonProfits.length > 0) {
          callText += `involve a non-profit with a track record of waste, fraud, or abuse`;
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
          np.evaluation.toLowerCase().includes("yes") ||
          (np.evaluation.toLowerCase().includes("evidence") &&
            !np.evaluation.toLowerCase().includes("no clear evidence"))
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
          <h1 className="text-5xl font-bold text-green-600">
            ${totalSuspectFunding.toLocaleString()}
          </h1>
          <p className="text-right text-lg">Suspicious Spending to Audit</p>
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
                Analyze HUD CDBG fund reports to identify non-profit
                organizations and evaluate them based on news coverage.
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
