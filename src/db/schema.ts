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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  },
  (table) => [unique().on(table.legistarClient, table.legistarEventId)]
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
