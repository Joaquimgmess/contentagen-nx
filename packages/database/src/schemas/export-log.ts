import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { user } from "./auth";
import { content } from "./content";

/**
 * ExportLogOptionsSchema defines the structure for the options JSONB field.
 * - format: The export format (e.g., 'json', 'csv', etc.)
 * - [other options can be added as needed]
 */
export const ExportLogOptionsSchema = z.object({
   fileName: z.string().optional(),
   format: z.string(),
});
export type ExportLogOptions = z.infer<typeof ExportLogOptionsSchema>;
export const exportLog = pgTable("export_log", {
   contentId: uuid("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
   createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
   id: uuid("id").primaryKey().defaultRandom(),
   options: jsonb("options").$type<ExportLogOptions>(),
   userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
});

export type ExportLog = typeof exportLog.$inferSelect;
export type ExportLogInsert = typeof exportLog.$inferInsert;

import {
   createInsertSchema,
   createSelectSchema,
   createUpdateSchema,
} from "drizzle-zod";
export const ExportLogInsertSchema = createInsertSchema(exportLog);
export const ExportLogSelectSchema = createSelectSchema(exportLog);
export const ExportLogUpdateSchema = createUpdateSchema(exportLog);
