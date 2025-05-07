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
import { CommentMarkup } from "./CommentMarkup";
import { twMerge } from "tailwind-merge";
const EXAMPLE_PLANS = [
  {
    id: "denver_townhome",
    name: "Townhome",
    path: "https://dbnbeqjmkqdrmhxqoybt.supabase.co/storage/v1/object/public/uploaded-plans/denver_townhome/webp-small/15.webp",
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

const DemoCommentAnalyses = [
  {
    comment:
      "Using plan graphics, verify stairs comply with dimensional requirements per IRC Section R311, including widths, headroom, riser and tread dimensions, nosings, landings, slope, and handrails.",
    explanation:
      "Review the plan to ensure stairs meet IRC Section R311 requirements, checking width, headroom, riser/tread dimensions, nosings, landings, slope, and handrails. Verify these details are clearly dimensioned and noted on the drawing.",
    bbox: {
      x1: 517.5,
      y1: 793.492,
      x2: 785,
      y2: 1001.8670000000001,
    },
  },
  // this one isn't great; vents would probably go on mech plan, not arch plan
  // {
  //   comment: "DRYER VENT TO EXHAUST MIN. 3' FROM WINDOW",
  //   explanation:
  //     "Ensure the dryer vent is clearly indicated on the plan at least 3 feet away from any windows on the same level. Add a note specifying the minimum required distance from windows per code requirements.",
  //   bbox: {
  //     x1: 1552.5,
  //     y1: 778.489,
  //     x2: 1735,
  //     y2: 986.864,
  //   },
  // },
  {
    comment:
      "Provide dimensions on plans verifying bathroom fixture clearances in accordance with IRC Section R307.1.",
    explanation:
      "Review the floor plans for each bathroom shown and verify that all necessary clearances around toilets, sinks, and showers/tubs are depicted with dimensions according to IRC Section R307.1. Add or adjust dimensions as needed on the drawings to clearly indicate these clearances.",
    bbox: {
      x1: 690,
      y1: 650,
      x2: 822,
      y2: 825,
    },
  },
  {
    comment:
      "Verify ventilation will be provided in the bathrooms. If using natural ventilation, provide dimensions and operation of all windows; if mechanical, verify local exhaust system.",
    explanation:
      "Review the floor plans for bathroom windows, confirming their size and operability are noted if natural ventilation is intended. If mechanical ventilation is planned, ensure a local exhaust system is indicated within the bathroom areas on the drawings.",
    bbox: {
      x1: 1400,
      y1: 630,
      x2: 1980,
      y2: 830,
    },
  },
  {
    comment:
      "Note compliance with glazing safety requirements per R308.4.5 for glazing adjacent to wet areas such as bathrooms and pools in basement and main level bathrooms.",
    explanation:
      "Review the drawings for windows in bathrooms, specifically in the basement and main level plans, and ensure they meet the size and location requirements of R308.4.5 for safety glazing. Verify that all shower and tub enclosures, regardless of location, are also designated to receive safety glazing per code.",
    bbox: {
      x1: 280,
      y1: 650,
      x2: 340,
      y2: 830,
    },
  },
];

const DEMO_MODE = true;

export default function PlanCheckPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(
    "denver_townhome"
  );
  const [phase, setPhase] = useState<PlanCheckPhase>("upload");
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
      setPhase("search-comments");

      // Start searching for similar comments
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

      if (DEMO_MODE) {
        setCommentAnalyses(DemoCommentAnalyses);
      } else {
        // Analyze each comment in sequence
        for (const comment of applyData.relevantComments) {
          await analyzeComment(comment);
          // Don't get ratelimited
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      setPhase("done");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">AI Plan Check</h1>

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

                  <Select
                    onValueChange={setSelectedPlan}
                    defaultValue="denver_townhome"
                  >
                    <SelectTrigger className="w-auto">
                      <SelectValue />
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
                  <div>
                    <Button
                      onClick={handleCheck}
                      disabled={phase !== "upload" && phase !== "done"}
                      className="rainbow-button"
                    >
                      {phase === "upload" || phase === "done"
                        ? "Check plan"
                        : "Analyzing..."}
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
                  {commentAnalyses.map((analysis, index) => (
                    <CommentMarkup
                      key={analysis.comment}
                      index={index}
                      analysis={analysis}
                      isSelected={selectedCommentIndex === index}
                      onSelect={() => setSelectedCommentIndex(index)}
                      imageScaleFactor={imageScaleFactor}
                    />
                  ))}
                </div>
                <div
                  className={twMerge(
                    "basis-1/4 flex flex-col",
                    commentAnalyses.length === 0 && "gap-4"
                  )}
                >
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
                    <>
                      <h2 className="text-lg p-3 font-semibold sticky top-0 bg-white border-t">
                        Comments on similar plans
                      </h2>
                      <div
                        className="w-full"
                        style={{ maxHeight: "700px", overflowY: "auto" }}
                      >
                        {commentAnalyses.map((analysis, index) => (
                          <div
                            key={analysis.comment}
                            ref={
                              selectedCommentIndex === index
                                ? (el) =>
                                    el?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "nearest",
                                    })
                                : undefined
                            }
                            className={`border-b cursor-pointer hover:bg-gray-100 p-3 ${
                              selectedCommentIndex === index ? "bg-blue-50" : ""
                            }`}
                            onClick={() => setSelectedCommentIndex(index)}
                          >
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                backgroundColor: "rgba(73, 105, 245)",
                                borderColor: "black",
                                borderWidth: 1,
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                fontWeight: "bold",
                                marginBottom: "10px",
                                marginLeft: "-2px",
                              }}
                            >
                              {index + 1}
                            </div>
                            <p className="italic border-l-2 pl-2 border-black mb-2">
                              {analysis.comment}
                            </p>
                            <p>{analysis.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </>
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
