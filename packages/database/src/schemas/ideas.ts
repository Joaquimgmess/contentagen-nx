import { relations } from "drizzle-orm";
import {
   index,
   jsonb,
   pgEnum,
   pgTable,
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

export const ideiaStatusEnum = pgEnum("ideia_status", [
   "pending",
   "approved",
   "rejected",
]);

export const IdeiaMetaSchema = z.object({
   sources: z.array(z.string()).optional(),
   tags: z.array(z.string()).optional(),
});
export type IdeaMeta = z.infer<typeof IdeiaMetaSchema>;
export const IdeaContentSchema = z.object({
   description: z
      .string()
      .min(1)
      .describe("The meta description of the blog post idea"),
   title: z.string().min(1).describe("The headline of the blog post idea"),
});
export const ConfidenceScoreSchema = z.object({
   rationale: z
      .string()
      .optional()
      .describe("Rationale for the confidence score"),
   score: z.string().min(1).describe("Confidence score between 0 and 100"),
});
export type ConfidenceScoreSchema = z.infer<typeof ConfidenceScoreSchema>;
export type IdeaContentSchema = z.infer<typeof IdeaContentSchema>;
export const ideas = pgTable(
   "ideas",
   {
      agentId: uuid("agent_id")
         .notNull()
         .references(() => agent.id, { onDelete: "cascade" }),
      confidence: jsonb("confidence")
         .$type<ConfidenceScoreSchema>()
         .notNull()
         .default({
            rationale: "",
            score: "0",
         }),
      content: jsonb("content").$type<IdeaContentSchema>().notNull().default({
         description: "",
         title: "",
      }),
      createdAt: timestamp("created_at")
         .$defaultFn(() => new Date())
         .notNull(),
      id: uuid("id").primaryKey().defaultRandom(),
      meta: jsonb("meta").$type<IdeaMeta>().default({
         sources: [],
         tags: [],
      }),
      status: ideiaStatusEnum("status").default("pending"),
      updatedAt: timestamp("updated_at")
         .$defaultFn(() => new Date())
         .notNull(),
   },
   (table) => [index("ideias_agent_id_idx").on(table.agentId)],
);

export const ideasRelations = relations(ideas, ({ one }) => ({
   agent: one(agent, {
      fields: [ideas.agentId],
      references: [agent.id],
   }),
}));

export type IdeiaStatus = (typeof ideiaStatusEnum.enumValues)[number];
export type IdeaSelect = typeof ideas.$inferSelect;
export type IdeaInsert = typeof ideas.$inferInsert;
export const IdeaInsertSchema = createInsertSchema(ideas);
export const IdeaSelectSchema = createSelectSchema(ideas);
export const IdeaUpdateSchema = createUpdateSchema(ideas);
