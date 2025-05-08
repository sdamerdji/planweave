import {
  integer,
  pgTable,
  text,
  date,
  boolean,
  vector,
  index,
  jsonb,
  unique,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { PlanningSearchJurisdiction } from "@/src/constants";

export const matter = pgTable("matter", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  legistarClient: text().notNull(),
  matterId: integer().unique().notNull(),
  matterGuid: text().unique(),
  matterFile: text(),
  date: date(),
  title: text(),

  attachmentsFetched: boolean().default(false).notNull(),
});

export const matterAttachment = pgTable("matter_attachment", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  legistarClient: text(),
  matterId: integer().references(() => matter.matterId),
  matterAttachmentId: integer().unique(),
  matterAttachmentGuid: text().unique(),

  fileName: text(),
  hyperlink: text(),
});

export const matterAttachmentText = pgTable(
  "matter_attachment_text",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    matterAttachmentId: integer()
      .references(() => matterAttachment.matterAttachmentId)
      .unique(),
    text: text().notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (table) => [
    index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const embeddingCache = pgTable("embedding_cache", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  textHash: text().unique().notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
});

export const rawEvent = pgTable(
  "raw_event",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    legistarClient: text().notNull(),
    legistarEventId: integer().notNull(),
    json: jsonb().notNull(),
  },
  (table) => [unique().on(table.legistarClient, table.legistarEventId)]
);

export const eventAgendaText = pgTable(
  "event_agenda_text",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    legistarClient: text().notNull(),
    legistarEventId: integer().notNull(),
    text: text().notNull(),
    agendaUrl: text().notNull(),
  },
  (table) => [
    unique().on(table.legistarClient, table.legistarEventId),
    index("event_agenda_text_tsvector_index").using(
      "gin",
      sql`to_tsvector('english', ${table.text})`
    ),
  ]
);

export const eventMinutesText = pgTable(
  "event_minutes_text",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    legistarClient: text().notNull(),
    legistarEventId: integer().notNull(),
    text: text().notNull(),
  },
  (table) => [unique().on(table.legistarClient, table.legistarEventId)]
);

export const documentChunk = pgTable(
  "document_chunk",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    legistarClient: text().notNull(),
    documentTable: text().notNull(),
    documentId: integer().notNull(),
    index: integer().notNull(),

    text: text().notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  },
  (table) => [
    unique().on(table.documentTable, table.documentId, table.index),
    index("document_chunk_tsvector_index").using(
      "gin",
      sql`to_tsvector('english', ${table.text})`
    ),
    index("document_chunk_embedding_index").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const rawCivicplusAsset = pgTable(
  "raw_civicplus_asset",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cityName: text().notNull(),
    civicplusMeetingId: text().notNull(),
    assetType: text().notNull(),
    json: jsonb().notNull(),
  }
  // TODO: this constraint couldn't be enforced
  // (table) => [
  //   unique("raw_civicplus_asset_city_meeting_asset_type").on(
  //     table.cityName,
  //     table.civicplusMeetingId,
  //     table.assetType
  //   ),
  // ]
);

export const civicPlusDocumentText = pgTable(
  "civic_plus_document_text",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cityName: text().notNull(),
    civicplusMeetingId: text().notNull(),
    documentId: text().notNull(), // Will be meeting_id + asset_type
    templateName: text().notNull(), // Will be asset_type
    committeeName: text(),
    meetingDate: text(),
    meetingTime: text(),
    text: text().notNull(),
    documentUrl: text().notNull(),
  },
  (table) => [
    unique("civic_plus_document_text_city_document_id").on(
      table.cityName,
      table.documentId
    ),
  ]
);

// TODO: Separate schema files for separate tables?

export const rawPrimeGovMeeting = pgTable(
  "raw_prime_gov_meeting",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    primeGovClient: text().notNull(),
    primeGovMeetingId: integer().notNull(),
    json: jsonb().notNull(),
  },
  (table) => [unique().on(table.primeGovClient, table.primeGovMeetingId)]
);

export const primeGovDocumentText = pgTable(
  "prime_gov_document_text",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    primeGovClient: text().notNull(),
    primeGovMeetingId: integer().notNull(),
    primeGovDocumentId: integer().notNull(),
    primeGovTemplateName: text().notNull(),
    text: text().notNull(),
    // TODO: this should be not null
    documentUrl: text(),
  },
  // we actually have multiple documents per meeting
  (table) => [
    unique("prime_gov_document_text_client_document_id").on(
      table.primeGovClient,
      table.primeGovDocumentId
    ),
  ]
);

// *thinking cap*
// this fucking sucks actually
export const granicusEvent = pgTable(
  "granicus_event",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    granicusClient: text().notNull(),
    granicusId: text().notNull(),
    agendaUrl: text().notNull(),
    name: text().notNull(),
    date: date().notNull(),
  },
  (table) => [unique().on(table.granicusClient, table.granicusId)]
);

export const scrapedAgendaText = pgTable(
  "scraped_agenda_text",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp().notNull().defaultNow(),

    // TODO: would be better if we had enums or table rows for every city
    jurisdiction: text().notNull(),
    agendaUrl: text().notNull(),
    text: text().notNull(),

    // Extracted by LLM
    meetingTimestamp: timestamp(),
    body: text(),
  },
  (table) => [unique().on(table.agendaUrl)]
);

export const codeDocument = pgTable("code_document", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  jurisdiction: text().notNull(),
  pdfUrl: text().notNull().unique(),
  pdfTitle: text().notNull(),
  pdfContent: text().notNull(),
});

export const codeChunk = pgTable(
  "code_chunk",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    jurisdiction: text().$type<PlanningSearchJurisdiction>().notNull(),
    // pdfTitle + headingText + bodyText (text that is actually embedded)
    text: text().notNull(),
    pdfTitle: text().notNull(),
    headingText: text().notNull(),
    bodyText: text().notNull(),
    htmlContent: text(), // if available, this will be rendered
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    pdfUrl: text(),
  },
  (table) => [
    index("code_chunk_tsvector_index").using(
      "gin",
      sql`to_tsvector('english', ${table.text})`
    ),
    index("code_chunk_embedding_index").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const userSearch = pgTable("user_search", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  createdAt: timestamp().notNull().defaultNow(),
  firstSearchId: integer(),
  jurisdiction: text().$type<PlanningSearchJurisdiction>(),
  jankUserHash: text(),

  query: text().notNull(),
  responseText: text().notNull(),
  documents: jsonb().notNull(),

  feedback: text(),
});

export const hudDocument = pgTable("hud_document", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  createdAt: timestamp().notNull().defaultNow(),
  jurisdiction: text().notNull(),
  documentUrl: text().notNull().unique(),
  text: text().notNull(),
});

export const planReviewComment = pgTable(
  "plan_review_comment",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp().notNull().defaultNow(),
    jurisdiction: text().notNull(),
    recordNumber: text().notNull(),
    documentName: text().notNull(),
    comment: text().notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (table) => [
    unique("record_number_document_name_comment").on(
      table.recordNumber,
      table.documentName,
      table.comment
    ),
    index("plan_review_comment_embedding_index").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const jurisdictions = pgTable(
  "jurisdictions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    jurisdiction: text().notNull(),
    state: text().notNull(),
    isCity: boolean().default(false).notNull(),
    isCounty: boolean().default(false).notNull(),
  },
  (table) => [unique("jurisdiction_state").on(table.jurisdiction, table.state)]
);
