import { date, pgTable, text } from "drizzle-orm/pg-core";

export const unifiedEvent = pgTable("unified_event", {
  source: text().notNull(),
  client: text().notNull(),
  source_event_id: text().notNull(),
  unified_event_id: text().notNull(),
  event_date: date(),
  event_body_name: text().notNull(),
});

export const unifiedDocumentText = pgTable("unified_document_text", {
  source: text().notNull(),
  client: text().notNull(),
  source_event_id: text().notNull(),
  source_document_id: text(),
  unified_event_id: text().notNull(),
  truncated_text: text().notNull(),
  event_date: date(),
  document_url: text(),
});
