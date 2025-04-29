"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EXAMPLE_PLANS = [
  {
    id: "concord_adu_5",
    name: "1 Bedroom ADU",
    path: "/example-plans/concord_adu_5.pdf",
  },
];

export default function PlanCheckPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleCheck = async () => {
    if (!selectedPlan) return;

    setIsChecking(true);
    try {
      const response = await fetch("/api/plan-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: selectedPlan }),
      });

      if (!response.ok) throw new Error("Failed to check plans");

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error checking plans:", error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Plan Check</h1>

      <Card className="p-6 mb-8">
        <div className="space-y-4">
          <div className="flex justify-between">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Plan
              </label>
              <Select onValueChange={setSelectedPlan}>
                <SelectTrigger>
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
            <div className="relative">
              <div className="rainbow-border-hover">
                <Button>Check plan</Button>
              </div>
            </div>
          </div>

          {selectedPlan && (
            <div className="mt-4">
              <iframe
                src={EXAMPLE_PLANS.find((p) => p.id === selectedPlan)?.path}
                className="w-full h-[600px] border rounded-lg"
                title="PDF Preview"
              />
            </div>
          )}
        </div>
      </Card>

      {results && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Check Results</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
