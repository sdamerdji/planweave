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

// Function to parse search query with operators
const parseSearchQuery = (query: string): string => {
  try {
    if (!query || query.trim() === "") {
      return "";
    }

    // Replace multiple spaces with single space and trim
    const normalizedQuery = query.trim().replace(/\s+/g, " ");

    // Split by 'or' (case insensitive) and process each part
    const orParts = normalizedQuery.split(/\s+or\s+/i);

    // Process each 'or' part (which may contain 'and's)
    const processedOrParts = orParts.map((part) => {
      // Split by 'and' (case insensitive) and join with '&'
      const andParts = part.split(/\s+and\s+/i);
      const processedAndParts = andParts.map((andPart) => {
        // For each term, escape special characters and replace spaces with &
        const cleanedPart = andPart
          .trim()
          .replace(/[!:&|()]/g, " ") // Remove PostgreSQL tsquery special chars
          .replace(/\s+/g, " ")
          .trim();

        if (!cleanedPart) return "";

        // For multi-word terms, join with &
        return cleanedPart.split(" ").filter(Boolean).join(" & ");
      });

      return processedAndParts.filter(Boolean).join(" & ");
    });

    // Join all 'or' parts with '|'
    const result = processedOrParts.filter(Boolean).join(" | ");
    return result || "";
  } catch (error) {
    console.error("Error parsing search query:", error);
    // Fallback to a basic query without operators
    return query.trim().replace(/\s+/g, " & ");
  }
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

    // Parse the search query to handle operators
    // This enables logical operators in search:
    // - "term1 OR term2" will match documents containing either term1 or term2
    // - "term1 AND term2" will match documents containing both term1 and term2
    // - Multiple words without operators are treated as AND conditions
    // Example: "site inventory OR housing element OR annual progress report"
    // will match any document containing any of these phrases
    const parsedQuery = parseSearchQuery(searchQuery);
    logWithClientInfo(`Parsed query: "${parsedQuery}"`);

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
    let matches = [];

    try {
      matches = await db
        .select({
          unifiedEventId: unifiedDocumentText.unified_event_id,
          documentUrl: unifiedDocumentText.document_url,
          headline: sql<string>`ts_headline(
              'english',
              ${unifiedDocumentText.truncated_text},
              to_tsquery('english', ${parsedQuery}),
              'MaxWords=100, MinWords=50'
            )`,
        })
        .from(unifiedDocumentText)
        .where(
          and(
            sql`to_tsquery('english', ${parsedQuery}) @@ to_tsvector('english', ${unifiedDocumentText.truncated_text})`,
            gte(unifiedDocumentText.event_date, cutoffDateStr ?? "1000-01-01")
          )
        )
        .orderBy(desc(unifiedDocumentText.event_date))
        .limit(50);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logWithClientInfo(`Error executing PostgreSQL search query: ${errorMsg}`);

      // Fallback to a simple search without operators if the parsed query fails
      const fallbackQuery = searchQuery.trim().replace(/\s+/g, " & ");
      logWithClientInfo(`Falling back to simple query: "${fallbackQuery}"`);

      matches = await db
        .select({
          unifiedEventId: unifiedDocumentText.unified_event_id,
          headline: sql<string>`ts_headline(
              'english',
              ${unifiedDocumentText.truncated_text},
              plainto_tsquery('english', ${searchQuery}),
              'MaxWords=100, MinWords=50'
            )`,
        })
        .from(unifiedDocumentText)
        .where(
          and(
            sql`plainto_tsquery('english', ${searchQuery}) @@ to_tsvector('english', ${unifiedDocumentText.truncated_text})`,
            gte(unifiedDocumentText.event_date, cutoffDateStr ?? "1000-01-01")
          )
        )
        .orderBy(desc(unifiedDocumentText.event_date))
        .limit(50);
    }

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
