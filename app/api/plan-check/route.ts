import { NextResponse } from "next/server";

const PLAN_CHECKS = {
  "residential-single": {
    status: "success",
    checks: [
      {
        type: "dimension_check",
        status: "pass",
        message: "All dimensions are within acceptable ranges",
      },
      {
        type: "code_compliance",
        status: "warning",
        message:
          "Some elements may not meet current building code requirements",
      },
      {
        type: "accessibility",
        status: "pass",
        message: "Meets ADA accessibility requirements",
      },
    ],
  },
  "residential-multi": {
    status: "success",
    checks: [
      {
        type: "dimension_check",
        status: "warning",
        message: "Some unit dimensions are below minimum requirements",
      },
      {
        type: "code_compliance",
        status: "pass",
        message: "Meets all current building code requirements",
      },
      {
        type: "fire_safety",
        status: "pass",
        message: "Fire safety measures are adequate",
      },
    ],
  },
  commercial: {
    status: "success",
    checks: [
      {
        type: "dimension_check",
        status: "pass",
        message: "All dimensions are within acceptable ranges",
      },
      {
        type: "code_compliance",
        status: "warning",
        message:
          "Some elements may not meet current building code requirements",
      },
      {
        type: "accessibility",
        status: "pass",
        message: "Meets ADA accessibility requirements",
      },
      {
        type: "fire_safety",
        status: "pass",
        message: "Fire safety measures are adequate",
      },
    ],
  },
};

export async function POST(request: Request) {
  try {
    const { planId } = await request.json();

    if (!planId || !(planId in PLAN_CHECKS)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    return NextResponse.json(PLAN_CHECKS[planId as keyof typeof PLAN_CHECKS]);
  } catch (error) {
    console.error("Error processing plan check:", error);
    return NextResponse.json(
      { error: "Failed to process plan check" },
      { status: 500 }
    );
  }
}
