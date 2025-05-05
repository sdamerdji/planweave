"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CircleCheck, CircleArrowRight } from "lucide-react";
import useResizeObserver from "use-resize-observer";

const EXAMPLE_PLANS = [
  {
    id: "denver_townhome",
    name: "Townhome",
    path: "https://dbnbeqjmkqdrmhxqoybt.supabase.co/storage/v1/object/public/uploaded-plans/denver_townhome/webp-small/8.webp",
  },
];

const PlanCheckPhases = [
  "upload",
  "describe-plan",
  "search-comments",
  "apply-comments",
  "explain-comments",
  "done",
];

type PlanCheckPhase = (typeof PlanCheckPhases)[number];

const getIconForPhase = (
  phase: PlanCheckPhase,
  currentPhase: PlanCheckPhase
) => {
  const phaseIndex = PlanCheckPhases.indexOf(phase);
  const currentPhaseIndex = PlanCheckPhases.indexOf(currentPhase);

  if (phaseIndex < currentPhaseIndex) {
    return <CircleCheck className="text-green-500" />;
  } else if (phaseIndex === currentPhaseIndex) {
    return <Loader2 className="animate-spin" />;
  } else {
    return <CircleArrowRight className="text-gray-500" />;
  }
};

export default function PlanCheckPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [phase, setPhase] = useState<PlanCheckPhase>("upload");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [commentAnalyses, setCommentAnalyses] = useState<
    Array<{
      comment: string;
      explanation: string;
      bbox: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      };
    }>
  >([]);
  console.log(commentAnalyses);
  const [selectedCommentIndex, setSelectedCommentIndex] = useState<
    number | null
  >(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const [naturalImageWidth, setNaturalImageWidth] = useState<number | null>(
    null
  );
  const { width: imageWidth } = useResizeObserver<HTMLImageElement>({
    // @ts-expect-error
    ref: imageRef,
  });
  useEffect(() => {
    if (imageRef.current) {
      setNaturalImageWidth(imageRef.current.naturalWidth);
    }
  }, [imageRef.current]);

  const imageScaleFactor =
    imageWidth && naturalImageWidth ? imageWidth / naturalImageWidth : 1;

  const analyzeComment = async (comment: string) => {
    if (!selectedPlan) return;

    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch("/api/plan-check/analyze-comment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId: selectedPlan,
            comment,
          }),
        });

        if (response.status === 429) {
          // Calculate exponential backoff delay
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Rate limited. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (!response.ok) throw new Error("Failed to analyze comment");
        const data = await response.json();

        setCommentAnalyses((prev) => [
          ...prev,
          {
            comment,
            explanation: data.explanation,
            bbox: data.bbox,
          },
        ]);
        return; // Success, exit the retry loop
      } catch (error) {
        if (attempt === maxRetries - 1) {
          console.error("Error analyzing comment:", error);
          throw error; // Re-throw on last attempt
        }
        // Otherwise continue to next retry
      }
    }
  };

  const handleCheck = async () => {
    if (!selectedPlan) return;

    setIsChecking(true);
    setCommentAnalyses([]);
    try {
      setPhase("describe-plan");
      const response = await fetch("/api/plan-check/describe-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: selectedPlan }),
      });

      if (!response.ok) throw new Error("Failed to check plans");

      const data = await response.json();
      setResults(data);
      setPhase("search-comments");

      // Start searching for similar comments
      setIsSearching(true);
      const searchResponse = await fetch("/api/plan-check/search-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          descriptors: data.descriptors || [],
        }),
      });

      if (!searchResponse.ok) throw new Error("Failed to search comments");
      const searchData = await searchResponse.json();
      setSearchResults(searchData.results);
      setPhase("apply-comments");

      // Get all comments from search results
      const allComments = searchData.results.flatMap((result: any) =>
        result.comments.map((comment: any) => comment.comment)
      );

      // Apply comments to the plan
      const applyResponse = await fetch("/api/plan-check/apply-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlan,
          comments: allComments,
        }),
      });

      if (!applyResponse.ok) throw new Error("Failed to apply comments");
      const applyData = await applyResponse.json();
      setPhase("explain-comments");

      //       "Verify stairs conform to dimensional requirements including width, headroom, riser and tread dimensions, nosing, landings, and handrails per IRC R311.7."
      // 1
      // :
      // "Using plan graphics, verify stairs comply with dimensional requirements per IRC Section R311, including widths, headroom, riser and tread dimensions, nosings, landings, slope, and handrails."
      // 2
      // :
      // "Using plan graphics and/or notes, verify stairs conform to dimensional requirements including width and handrail specifications per IRC R311.7."
      // 3
      // :
      // "Access stairs: provide details and dimensions for 2021 IRC fully compliant access stairs and handrails."
      // 4
      // :
      // "Verify smoke alarms are provided as required per Section R314 with location, interconnection, power source, and system requirements."

      // Analyze each comment in sequence
      for (const comment of applyData.relevantComments) {
        await analyzeComment(comment);
        // Don't get ratelimited
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      setPhase("done");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Plan Check</h1>

      <Card className="p-6 mb-8">
        <div className="space-y-4">
          <div className="flex justify-between"></div>

          <div>
            <div>
              <div className="flex justify-between">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Plan
                  </label>

                  <Select onValueChange={setSelectedPlan}>
                    <SelectTrigger className="w-auto">
                      <SelectValue placeholder="Choose a plan to check" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAMPLE_PLANS.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative" style={{ height: "36px" }}>
                  <div className="rainbow-border-hover">
                    <Button
                      onClick={handleCheck}
                      disabled={isChecking || isSearching}
                    >
                      {isChecking
                        ? "Analyzing plan..."
                        : isSearching
                          ? "Searching comments..."
                          : "Check plan"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex mt-4">
                <div className="relative basis-3/4">
                  {selectedPlan && (
                    <img
                      ref={imageRef}
                      src={
                        EXAMPLE_PLANS.find((p) => p.id === selectedPlan)?.path
                      }
                      alt="Plan"
                    />
                  )}
                  {selectedCommentIndex !== null && (
                    <div
                      style={{
                        position: "absolute",
                        top:
                          commentAnalyses[selectedCommentIndex].bbox.y1 *
                          imageScaleFactor,
                        left:
                          commentAnalyses[selectedCommentIndex].bbox.x1 *
                          imageScaleFactor,
                        width:
                          (commentAnalyses[selectedCommentIndex].bbox.x2 -
                            commentAnalyses[selectedCommentIndex].bbox.x1) *
                          imageScaleFactor,
                        height:
                          (commentAnalyses[selectedCommentIndex].bbox.y2 -
                            commentAnalyses[selectedCommentIndex].bbox.y1) *
                          imageScaleFactor,
                        backgroundColor: "blue",
                        opacity: 0.2,
                      }}
                    />
                  )}
                </div>
                <div className="basis-1/4 flex flex-col items-end gap-4">
                  {commentAnalyses.length === 0 && (
                    <div className="w-full flex flex-col gap-4 pl-4">
                      <div className="bg-gray-100 p-4 rounded-lg flex items-center gap-2">
                        {getIconForPhase("describe-plan", phase)}
                        <h2>Analyzing plan</h2>
                      </div>
                      <div className="bg-gray-100 p-4 rounded-lg flex items-center gap-2">
                        {getIconForPhase("search-comments", phase)}
                        <h2>Searching comment database</h2>
                      </div>
                      <div className="bg-gray-100 p-4 rounded-lg flex items-center gap-2">
                        {getIconForPhase("apply-comments", phase)}
                        <h2>Assessing comment relevance</h2>
                      </div>
                      <div className="bg-gray-100 p-4 rounded-lg flex items-center gap-2">
                        {getIconForPhase("explain-comments", phase)}
                        <h2>Explaining relevant comments</h2>
                      </div>
                    </div>
                  )}
                  {commentAnalyses.length > 0 && (
                    <div
                      className="w-full border-t relative"
                      style={{ maxHeight: "700px", overflowY: "auto" }}
                    >
                      <h2 className="text-lg p-3 font-semibold sticky top-0 bg-white">
                        Comments on similar plans
                      </h2>
                      {commentAnalyses.map((analysis, index) => (
                        <div
                          key={analysis.comment}
                          className="border-b cursor-pointer hover:bg-gray-100 p-3"
                          onClick={() => setSelectedCommentIndex(index)}
                        >
                          <p className="italic border-l-2 pl-2 border-black mb-2">
                            {analysis.comment}
                          </p>
                          <p>{analysis.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
