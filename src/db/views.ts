import {
  date,
  integer,
  pgMaterializedView,
  pgTable,
  pgView,
  text,
} from "drizzle-orm/pg-core";
import { primeGovDocumentText } from "./schema";

export const unifiedEvent = pgTable("unified_event", {
  source: text().notNull(),
  client: text().notNull(),
  source_event_id: integer().notNull(),
  unified_event_id: text().notNull(),
  event_date: date().notNull(),
  event_body_name: text().notNull(),
});

export const unifiedDocumentText = pgTable("unified_document_text", {
  source: text().notNull(),
  client: text().notNull(),
  source_event_id: integer().notNull(),
  source_document_id: integer(),
  unified_event_id: text().notNull(),
  truncated_text: text().notNull(),
  event_date: date().notNull(),
});
