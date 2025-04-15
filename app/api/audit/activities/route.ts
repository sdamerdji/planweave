import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { hudDocument } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// Regex pattern to split documents by "Office of Community Planning and Development" followed by text and then "PGM Year"
const DOCUMENT_SPLIT_REGEX = /Office of Community Planning and Development[\s\S]*?(?=PGM Year)/gi;

// Regex to extract IDIS Activity
const IDIS_ACTIVITY_REGEX = /IDIS Activity:.*$/m;

// Extract IDIS Activity from text
function extractIDISActivity(text: string): string {
  const match = text.match(IDIS_ACTIVITY_REGEX);
  if (match && match[0]) {
    return match[0].replace(/\|/g, '').trim();
  }
  return "Unknown IDIS Activity";
}

export interface CDBGActivity {
  id: string;
  idisActivity: string;
  content: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jurisdiction = searchParams.get('jurisdiction') || 'san_diego_ca';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  
  try {
    // Query for HUD documents with matching jurisdiction
    console.log(`Querying database for jurisdiction: ${jurisdiction}`);
    const documents = await db
      .select()
      .from(hudDocument)
      .where(eq(hudDocument.jurisdiction, jurisdiction));

    if (documents.length === 0) {
      console.log(`No HUD documents found for jurisdiction: ${jurisdiction}`);
      return NextResponse.json({
        success: true,
        jurisdiction,
        activities: []
      });
    }

    console.log(`Found ${documents.length} HUD document(s).`);
    const activities: CDBGActivity[] = [];

    for (const doc of documents) {
      console.log(`Processing document ID: ${doc.id}`);
      
      // Split the document by pattern
      const fullText = doc.text;
      const splitParts = fullText.split(DOCUMENT_SPLIT_REGEX);
      
      // Skip the first part as it's before the first "PGM Year"
      const relevantParts = splitParts.slice(1);
      
      if (relevantParts.length === 0) {
        console.log("No relevant parts found in document.");
        continue;
      }
      
      // Apply limit if specified
      const partsToProcess = limit ? relevantParts.slice(0, limit) : relevantParts;
      
      console.log(`Found ${relevantParts.length} relevant project sections. Processing ${partsToProcess.length}.`);
      
      // Process each part to extract activity information
      for (let i = 0; i < partsToProcess.length; i++) {
        const part = "PGM Year" + partsToProcess[i]; // Add back the "PGM Year" that was removed in the split
        const idisActivity = extractIDISActivity(part);
        
        activities.push({
          id: `${doc.id}_${i}`,
          idisActivity,
          content: part
        });
      }
    }

    return NextResponse.json({
      success: true,
      jurisdiction,
      limit: limit || 'all',
      totalActivities: activities.length,
      activities
    });
  } catch (error) {
    console.error("Error retrieving CDBG activities:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
} 