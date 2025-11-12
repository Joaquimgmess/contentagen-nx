import { relations } from "drizzle-orm";

import {
   index,
   integer,
   jsonb,
   pgTable,
   text,
   timestamp,
   uniqueIndex,
   uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";
import { user } from "./auth";
import { content } from "./content";
export const VersionMetaSchema = z.object({
   changedFields: z.array(z.string()).optional(),
   diff: z
      .array(z.tuple([z.number(), z.string()]))
      .nullable()
      .optional(),
   lineDiff: z
      .array(
         z.object({
            content: z.string(),
            inlineChanges: z
               .array(
                  z.object({
                     text: z.string(),
                     type: z.enum(["add", "remove", "unchanged"]),
                  }),
               )
               .optional(),
            lineNumber: z.number().optional(),
            oldContent: z.string().optional(),
            type: z.enum(["add", "remove", "context", "modify"]),
         }),
      )
      .nullable()
      .optional(),
});
export const contentVersion = pgTable(
   "content_version",
   {
      contentId: uuid("content_id")
         .notNull()
         .references(() => content.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at")
         .$defaultFn(() => new Date())
         .notNull(),
      id: uuid("id").primaryKey().defaultRandom(),
      meta: jsonb("meta")
         .$type<z.infer<typeof VersionMetaSchema>>()
         .default({}),
      userId: text("user_id").references(() => user.id, {
         onDelete: "set null",
      }),
      version: integer("version").notNull(),
   },
   (table) => [
      index("content_version_content_id_idx").on(table.contentId),
      uniqueIndex("content_version_content_id_version_uidx").on(
         table.contentId,
         table.version,
      ),
   ],
);

export const contentVersionRelations = relations(contentVersion, ({ one }) => ({
   content: one(content, {
      fields: [contentVersion.contentId],
      references: [content.id],
   }),
   user: one(user, {
      fields: [contentVersion.userId],
      references: [user.id],
   }),
}));

export type ContentVersionSelect = typeof contentVersion.$inferSelect;
export type ContentVersionInsert = typeof contentVersion.$inferInsert;
export const ContentVersionInsertSchema = createInsertSchema(contentVersion);
export const ContentVersionSelectSchema = createSelectSchema(contentVersion);
