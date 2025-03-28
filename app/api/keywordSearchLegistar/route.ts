import { NextResponse } from "next/server";
import { db } from "@/src/db";
import { eventAgendaText, rawEvent } from "@/src/db/schema";
import { unifiedDocumentText, unifiedEvent } from "@/src/db/views";
import { eq, sql, and, gte, count, desc, inArray } from "drizzle-orm";

// Helper function for consistent log formatting
const logWithClientInfo = (message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

// Check if there are documents within date range
const checkHasDocumentsInDateRange = async (cutoffDateStr: string | null) => {
  const conditions = [];

  if (cutoffDateStr) {
    conditions.push(
      gte(sql`CAST((${rawEvent.json}->>'EventDate') AS DATE)`, cutoffDateStr)
    );
  }

  const result = await db
    .select({ count: count() })
    .from(rawEvent)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result[0].count > 0;
};

export async function POST(request: Request) {
  try {
    const { query: searchQuery, dateFilter } = await request.json();

    logWithClientInfo(
      `Processing keyword search query: "${searchQuery}" with date filter: ${dateFilter}`
    );

    // Add date filter condition if specified
    let cutoffDateStr = null;
    if (dateFilter && dateFilter !== "all") {
      const days = parseInt(dateFilter);
      logWithClientInfo(`Processing date filter for last ${days} days`);

      if (!isNaN(days)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDateStr = cutoffDate.toISOString();

        logWithClientInfo(`Date filter applied: Events after ${cutoffDateStr}`);
      }
    }

    // Check if there are documents within date range
    const hasDocsInRange = await checkHasDocumentsInDateRange(cutoffDateStr);
    if (!hasDocsInRange) {
      logWithClientInfo(
        `No documents found within the date range, returning early`
      );
      return NextResponse.json(
        {
          responseText: "No documents found within the specified time range.",
          documents: [],
        },
        { status: 201 }
      );
    }

    // Execute the query with all conditions
    logWithClientInfo(`Executing keyword search query across all clients`);

    const startTime = Date.now();
    const matches = await db
      .select({
        unifiedEventId: unifiedDocumentText.unified_event_id,
        headline: sql<string>`ts_headline(
            'english',
            ${unifiedDocumentText.truncated_text},
            phraseto_tsquery('english', ${searchQuery}),
            'MaxWords=100, MinWords=50'
          )`,
      })
      .from(unifiedDocumentText)
      .where(
        and(
          sql`phraseto_tsquery('english', ${searchQuery}) @@ to_tsvector('english', ${unifiedDocumentText.truncated_text})`,
          gte(unifiedDocumentText.event_date, cutoffDateStr ?? "1000-01-01")
        )
      )
      .orderBy(desc(unifiedDocumentText.event_date))
      .limit(50);

    const events = await db
      .select()
      .from(unifiedEvent)
      .where(
        inArray(
          unifiedEvent.unified_event_id,
          matches.map((doc) => doc.unifiedEventId)
        )
      );

    const documents = matches.map((match) => {
      const event = events.find(
        (event) => event.unified_event_id === match.unifiedEventId
      )!;
      return {
        id: event.source_event_id,
        client: event.client,
        body: event.event_body_name,
        dateStr: event.event_date,
        content: match.headline,
        // TODO: Add url
        url: match.unifiedEventId,
      };
    });

    const queryTime = Date.now() - startTime;
    logWithClientInfo(
      `Query execution time: ${queryTime}ms, returned ${documents.length} documents`
    );

    if (documents.length === 0) {
      logWithClientInfo(`No documents returned from query`);

      return NextResponse.json(
        {
          responseText:
            "No relevant documents found within timeframe specified.",
          documents: [],
        },
        { status: 201 }
      );
    }

    // Log results
    documents.forEach((doc, i) => {
      logWithClientInfo(
        `Document ${i + 1}/${documents.length}: ${doc.client} - ${doc.body} | ID: ${doc.id} | Date: ${doc.dateStr} | Content length: ${doc.content.length} chars`
      );
    });

    return NextResponse.json(
      {
        documents,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in keyword search:", error);
    return NextResponse.json(
      {
        documents: [],
      },
      { status: 500 }
    );
  }
}
