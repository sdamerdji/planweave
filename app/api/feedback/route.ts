import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { userSearch } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { searchId, feedback } = await request.json();

    if (!searchId || !feedback) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const updatedSearch = await db
      .update(userSearch)
      .set({ feedback })
      .where(eq(userSearch.id, searchId))
      .returning();

    if (updatedSearch.length === 0) {
      return NextResponse.json(
        { success: false, error: "Search not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedSearch[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update feedback" },
      { status: 500 }
    );
  }
}
