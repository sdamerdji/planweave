import { NextResponse } from "next/server";
import { embedTexts } from "@/src/EmbeddingClient";
import { db } from "@/src/db";
import { documentChunk, eventAgendaText, rawEvent } from "@/src/db/schema";
import { cosineDistance, eq, sql, and, gte, count } from "drizzle-orm";
import { evaluateDocumentRelevance } from "@/src/EvaluateDocumentRelevance";
import _ from "lodash";
import { OpenAIClient } from "@/src/OpenaiClient";

const USE_CRAG = true;

// Helper function for consistent log formatting
const logWithClientInfo = (legistarClient: string, message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${legistarClient}] ${message}`);
};

// TODO: this is kinda dumb but it works ok
const getKeywords = async (query: string) => {
  const systemPrompt = `
    You will be provided with a user query. We're going to do keyword search
    over a large set of documents, and we need to select a couple of the most
    important keywords to search with. Choose no more than 3.

    The keywords should ONLY be proper nouns.

    EXAMPLES:

    input: Is the budget of San Francisco larger than that of New York City?
    output: San Francisco, New York City

    input: What's the most recent hearing on 1024 Market St?
    output: 1024 Market St

    input: What's the most recent hearing on the budget?
    output: None

    Separate your keywords with commas.
    `;

  const response = await OpenAIClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
  });

  const responseText = response.choices[0].message.content ?? "";
  return responseText
    .split(",")
    .map((keyword) => keyword.trim())
    .flatMap((keyword) => keyword.split(" "))
    .filter((word) => word.toLocaleLowerCase() !== "none");
};

// Check if client exists in the database
const checkClientExists = async (legistarClient: string) => {
  const result = await db
    .select({ count: count() })
    .from(rawEvent)
    .where(eq(rawEvent.legistarClient, legistarClient));
  
  return result[0].count > 0;
};

// Check if client has documents within date range
const checkClientHasDocumentsInDateRange = async (legistarClient: string, cutoffDateStr: string | null) => {
  const conditions = [eq(rawEvent.legistarClient, legistarClient)];
  
  if (cutoffDateStr) {
    conditions.push(gte(sql`CAST((${rawEvent.json}->>'EventDate') AS DATE)`, cutoffDateStr));
  }
  
  const result = await db
    .select({ count: count() })
    .from(rawEvent)
    .where(and(...conditions));
  
  return result[0].count > 0;
};

// Check if client has agenda texts
const checkClientHasAgendaTexts = async (legistarClient: string) => {
  const result = await db
    .select({ count: count() })
    .from(eventAgendaText)
    .where(eq(eventAgendaText.legistarClient, legistarClient));
  
  return result[0].count > 0;
};

// Check if client has document chunks
const checkClientHasDocumentChunks = async (legistarClient: string) => {
  const result = await db
    .select({ count: count() })
    .from(documentChunk)
    .where(eq(documentChunk.legistarClient, legistarClient));
  
  return result[0].count > 0;
};

export async function POST(request: Request) {
  try {
    const { query: searchQuery, legistarClient, dateFilter } = await request.json();
    
    logWithClientInfo(legistarClient, `Processing query: "${searchQuery}" with date filter: ${dateFilter}`);
    
    // First check if this client exists at all
    const clientExists = await checkClientExists(legistarClient);
    if (!clientExists) {
      logWithClientInfo(legistarClient, `ERROR: No raw events found for this client in the database`);
      return NextResponse.json<SearchLegistarResponse>(
        {
          responseText: "No data found for this city.",
          documents: [],
        },
        { status: 201 }
      );
    }
    logWithClientInfo(legistarClient, `Found ${clientExists ? 'some' : 'no'} raw events for this client`);
    
    // Check if client has agenda texts
    const clientHasAgendaTexts = await checkClientHasAgendaTexts(legistarClient);
    logWithClientInfo(legistarClient, `Client has ${clientHasAgendaTexts ? 'some' : 'no'} agenda texts`);
    
    // Check if client has document chunks
    const clientHasDocumentChunks = await checkClientHasDocumentChunks(legistarClient);
    logWithClientInfo(legistarClient, `Client has ${clientHasDocumentChunks ? 'some' : 'no'} document chunks`);

    logWithClientInfo(legistarClient, `Generating embedding for query: "${searchQuery}"`);
    const queryEmbedding = Object.values(await embedTexts([searchQuery]))[0];
    logWithClientInfo(legistarClient, `Embedding generated successfully`);
    
    logWithClientInfo(legistarClient, `Extracting keywords from query: "${searchQuery}"`);
    const keywords = await getKeywords(searchQuery);
    logWithClientInfo(legistarClient, `Extracted keywords: ${JSON.stringify(keywords)}`);

    // Build conditions array for the query
    const conditions = [eq(rawEvent.legistarClient, legistarClient)];

    // Add date filter condition if specified
    let cutoffDateStr = null;
    if (dateFilter && dateFilter !== "all") {
      const days = parseInt(dateFilter);
      logWithClientInfo(legistarClient, `Processing date filter for last ${days} days`);
      
      if (!isNaN(days)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDateStr = cutoffDate.toISOString();
        
        logWithClientInfo(legistarClient, `Date filter applied: Events after ${cutoffDateStr}`);
        
        // Add date condition to the conditions array
        conditions.push(gte(sql`CAST((${rawEvent.json}->>'EventDate') AS DATE)`, cutoffDateStr));
      } else {
        logWithClientInfo(legistarClient, `Invalid date filter: ${dateFilter}, not applying date filter`);
      }
    } else {
      logWithClientInfo(legistarClient, `No date filter applied (all time)`);
    }
    
    // Check if client has documents within date range
    const hasDocsInRange = await checkClientHasDocumentsInDateRange(legistarClient, cutoffDateStr);
    logWithClientInfo(legistarClient, `Client has ${hasDocsInRange ? 'some' : 'no'} documents within the date range`);
    
    if (!hasDocsInRange) {
      logWithClientInfo(legistarClient, `No documents found within the date range, returning early`);
      return NextResponse.json<SearchLegistarResponse>(
        {
          responseText: "No documents found within the specified time range.",
          documents: [],
        },
        { status: 201 }
      );
    }

    // Execute the query with all conditions
    logWithClientInfo(legistarClient, `Executing main query with ${conditions.length} conditions`);
    
    const startTime = Date.now();
    const documents = (
      await db
        .select({
          document_chunk: documentChunk,
          event_agenda_text: eventAgendaText,
          raw_event: rawEvent
        })
        .from(documentChunk)
        .innerJoin(
          eventAgendaText,
          eq(documentChunk.documentId, eventAgendaText.id)
        )
        .innerJoin(
          rawEvent,
          and(
            eq(eventAgendaText.legistarClient, rawEvent.legistarClient),
            eq(eventAgendaText.legistarEventId, rawEvent.legistarEventId)
          )
        )
        .where(and(...conditions))
        .orderBy(
          // prioritize documents that contain the keywords
          sql`to_tsquery('english', ${keywords.join(" & ")}) @@ to_tsvector('english', ${documentChunk.text}) desc`,
          // then documents that are closer to the query embedding
          cosineDistance(documentChunk.embedding, queryEmbedding)
        )
        .limit(5)
    ).map((doc: any) => ({
      id: doc.document_chunk.id,
      body: (doc.raw_event.json as any)["EventBodyName"],
      dateStr: (doc.raw_event.json as any)["EventDate"],
      content: doc.event_agenda_text.text,
      snippet: doc.document_chunk.text,
      url: (doc.raw_event.json as any)["EventInSiteURL"],
    }));
    
    const queryTime = Date.now() - startTime;
    logWithClientInfo(legistarClient, `Query execution time: ${queryTime}ms, returned ${documents.length} documents`);
    
    if (documents.length === 0) {
      logWithClientInfo(legistarClient, `No documents returned from query despite passing previous checks. Possible reasons:
        1. No document chunks exist for this client's events
        2. Documents exist but don't meet the cosine similarity threshold
        3. Issue with the embedding or vector search
      `);
      
      return NextResponse.json<SearchLegistarResponse>(
        {
          responseText: "No relevant documents found within timeframe specified.",
          documents: [],
        },
        { status: 201 }
      );
    }
    
    // Log results
    documents.forEach((doc, i) => {
      logWithClientInfo(
        legistarClient,
        `Document ${i+1}/${documents.length}: ${doc.body} | ID: ${doc.id} | Date: ${doc.dateStr} | Content length: ${doc.content.length} chars`
      );
    });

    let relevantDocuments = documents;
    if (USE_CRAG) {
      logWithClientInfo(legistarClient, `Evaluating document relevance using CRAG`);
      
      const startCragTime = Date.now();
      const relevance = await Promise.all(
        documents.map((doc: any) => evaluateDocumentRelevance(searchQuery, doc.content))
      );
      const cragTime = Date.now() - startCragTime;
      
      logWithClientInfo(
        legistarClient,
        `CRAG evaluation complete in ${cragTime}ms. Results: ${JSON.stringify(relevance)}`
      );

      // Find documents deemed not relevant
      const nonRelevantDocuments = documents.filter((_: any, i: number) => !relevance[i]);
      
      // Log irrelevant documents with excerpts if any were filtered out
      if (nonRelevantDocuments.length > 0) {
        console.log(`\n${'#'.repeat(30)} DOCUMENTS DEEMED NOT RELEVANT FOR ${legistarClient} ${'#'.repeat(30)}`);
        
        nonRelevantDocuments.forEach((doc, index) => {
          // Display document ID
          const documentId = `document_chunk_id: ${doc.id || 'unknown'}`;
          
          console.log(`\nDocument ${index + 1}/${nonRelevantDocuments.length} | ${documentId}`);
          console.log(`Body: ${doc.body} | Date: ${doc.dateStr}`);
          console.log(`Excerpt (first 500 chars):`);
          console.log(doc.content.substring(0, 500) + (doc.content.length > 500 ? '...' : ''));
          
          // Add separator between documents (except after the last one)
          if (index < nonRelevantDocuments.length - 1) {
            console.log(`\n${'#'.repeat(80)}`);
          }
        });
        
        console.log(`\n${'#'.repeat(80)}\n`);
      }

      relevantDocuments = documents.filter((_: any, i: number) => relevance[i] === true);
      logWithClientInfo(
        legistarClient,
        `After CRAG filtering: ${relevantDocuments.length}/${documents.length} documents deemed relevant`
      );
      
      if (documents.length > 0 && relevantDocuments.length === 0) {
        logWithClientInfo(
          legistarClient,
          `CRITICAL: Documents found but ALL filtered out by CRAG as not relevant. Inspect raw documents.`
        );
      }
    }

    // Return early if no relevant documents are found
    if (relevantDocuments.length === 0) {
      logWithClientInfo(legistarClient, `No relevant documents after filtering, returning early`);
      return NextResponse.json<SearchLegistarResponse>(
        {
          responseText: "No relevant documents found within timeframe specified.",
          documents: [],
        },
        { status: 201 }
      );
    }

    logWithClientInfo(legistarClient, `Generating response with ${relevantDocuments.length} relevant documents`);
    
    const systemPrompt = `
      You will be provided with a USER QUERY as well as some SUPPORTING
      DOCUMENTS. Use the supporting documents to answer the user's question.

      The SUPPORTING DOCUMENTS are snippets of agendas for various city
      government meetings. It's possible that the SUPPORTING DOCUMENTS do not
      contain the answer, and in those cases it's ok to say that you don't have
      enough information to answer the question.
      `;

    const userPrompt = `
      USER QUERY:
      ${searchQuery}

      SUPPORTING DOCUMENTS:
      ${relevantDocuments.map((doc: any, i: number) => i + ") " + doc.body + " " + doc.dateStr + "\n\n" + doc.content).join("\n\n")}
      `;

    logWithClientInfo(legistarClient, `Requesting response from OpenAI API`);
    const startResponseTime = Date.now();
    const response = await OpenAIClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const responseTime = Date.now() - startResponseTime;

    const responseText = response.choices[0].message.content ?? "";
    logWithClientInfo(
      legistarClient,
      `Received response from OpenAI in ${responseTime}ms. Response length: ${responseText.length} chars`
    );

    logWithClientInfo(legistarClient, `Query successfully processed with ${relevantDocuments.length} relevant documents`);
    return NextResponse.json<SearchLegistarResponse>(
      {
        responseText: responseText,
        documents: relevantDocuments,
      },
      { status: 201 }
    );
  } catch (error) {
    let legistarClient = "unknown";
    try {
      // Try to extract legistar client from request for better error logging
      const requestData = await request.json();
      if (requestData.legistarClient) {
        legistarClient = requestData.legistarClient;
      }
    } catch (e) {
      // Ignore error in error handler
    }
    
    logWithClientInfo(legistarClient, `ERROR in processing: ${error instanceof Error ? error.message : String(error)}`);
    console.error("Full error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete" },
      { status: 500 }
    );
  }
}
