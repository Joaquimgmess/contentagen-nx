import { relations } from "drizzle-orm";
import {
   index,
   integer,
   jsonb,
   pgEnum,
   pgTable,
   text,
   timestamp,
   uuid,
} from "drizzle-orm/pg-core";
import {
   createInsertSchema,
   createSelectSchema,
   createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { agent } from "./agent";
import { contentVersion } from "./content-version";

export const ContentRequestSchema = z.object({
   description: z.string().min(1, "Description is required"),
   layout: z.enum(["tutorial", "article", "changelog"]),
});
export type ContentRequest = z.infer<typeof ContentRequestSchema>;
export const ContentStatsSchema = z.object({
   qualityScore: z
      .string()
      .optional()
      .describe("A score representing the quality of the content."),
   readTimeMinutes: z
      .string()
      .optional()
      .describe("Estimated reading time in minutes."),
   reasonOfTheRating: z
      .string()
      .optional()
      .describe(
         "The reason for the quality score rating, written in markdown.",
      ),
   wordsCount: z
      .string()
      .optional()
      .describe("The number of words in the content."),
});
export type ContentStats = z.infer<typeof ContentStatsSchema>;

export const ContentMetaSchema = z.object({
   description: z
      .string()
      .optional()
      .describe("A brief seo optmized description of the content."),
   keywords: z
      .array(z.string())
      .optional()
      .describe("SEO optimized keywords associated with the content."),
   slug: z
      .string()
      .optional()
      .describe("A URL-friendly identifier for the content."),
   sources: z
      .array(z.string())
      .optional()
      .describe("Sources or references used in the content."),
   title: z.string().optional().describe("The title of the content."),
});
export type ContentMeta = z.infer<typeof ContentMetaSchema>;

export const contentStatusEnum = pgEnum("content_status", [
   "pending",
   "draft",
   "approved",
   "failed",
]);

export const shareStatusEnum = pgEnum("share_status", ["private", "shared"]);

export const content = pgTable(
   "content",
   {
      agentId: uuid("agent_id")
         .notNull()
         .references(() => agent.id, { onDelete: "cascade" }),
      body: text("body").notNull().default(""),
      createdAt: timestamp("created_at")
         .$defaultFn(() => new Date())
         .notNull(),
      currentVersion: integer("current_version").default(0),
      id: uuid("id").primaryKey().defaultRandom(),
      imageUrl: text("image_url"),
      meta: jsonb("meta").$type<ContentMeta>().default({}),
      request: jsonb("request").$type<ContentRequest>().notNull(),
      shareStatus: shareStatusEnum("share_status").default("private"),
      stats: jsonb("stats").$type<ContentStats>().default({}),
      status: contentStatusEnum("status").default("pending"),

      updatedAt: timestamp("updated_at")
         .$defaultFn(() => new Date())
         .notNull(),
   },
   (table) => [index("content_agent_id_idx").on(table.agentId)],
);
export const contentRelations = relations(content, ({ one, many }) => ({
   agent: one(agent, {
      fields: [content.agentId],
      references: [agent.id],
   }),
   versions: many(contentVersion),
}));

export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];
export type ShareStatus = (typeof shareStatusEnum.enumValues)[number];
export type ContentSelect = typeof content.$inferSelect;
export type ContentInsert = typeof content.$inferInsert;
export const ContentInsertSchema = createInsertSchema(content);
export const ContentSelectSchema = createSelectSchema(content);
export const ContentUpdateSchema = createUpdateSchema(content);
export const ListContentByAgentInputSchema = z.object({
   agentId: z.array(z.uuid("Invalid Agent ID format.")),
   limit: z.number().min(1).max(100).optional().default(10),
   page: z.number().min(1).optional().default(1),
   status: z
      .enum(
         contentStatusEnum.enumValues,
         "Invalid content status. Must be one of: draft, approved.",
      )
      .array(),
});

export const GetContentByIdInputSchema = z.object({
   id: z.uuid("Invalid Content ID format."),
});

export const GetContentBySlugInputSchema = z.object({
   agentId: z.uuid("Invalid Agent ID format."),
   slug: z.string().min(1, "Slug is required."),
});
