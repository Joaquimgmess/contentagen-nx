import { relations } from "drizzle-orm";
import {
   index,
   jsonb,
   pgEnum,
   pgTable,
   text,
   timestamp,
   uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";
import { organization, user } from "./auth";
import type { CompetitorFeatureSelect } from "./competitor-feature";
import { competitorFeature } from "./competitor-feature";

export const knowledgeCreationStatusEnum = pgEnum("knowledge_creation_status", [
   "failed",
   "analyzing",
   "completed",
]);

export const CompetitorFindingsSchema = z
   .object({
      insights: z.array(
         z
            .string()
            .describe(
               "Key insights about the competitor's strategies, features, or market position",
            ),
      ),
      priorities: z.array(
         z
            .string()
            .describe(
               "Actionable priorities based on the competitive analysis, ordered by importance",
            ),
      ),
   })
   .describe(
      "Structured data representing competitive intelligence findings and recommended actions",
   );
export type CompetitorFindings = z.infer<typeof CompetitorFindingsSchema>;
export const competitor = pgTable(
   "competitor",
   {
      createdAt: timestamp("created_at").defaultNow().notNull(),
      findings: jsonb("findings")
         .$type<CompetitorFindings>()
         .default({ insights: [], priorities: [] }),
      id: uuid("id").primaryKey().defaultRandom(),
      logoPhoto: text("logo_photo"),
      name: text("name"),
      organizationId: text("organization_id")
         .references(() => organization.id, { onDelete: "cascade" })
         .notNull(),
      status: knowledgeCreationStatusEnum("status").default("analyzing"),
      summary: text("summary"),
      updatedAt: timestamp("updated_at")
         .defaultNow()
         .$onUpdate(() => new Date())
         .notNull(),
      uploadedFiles: jsonb("uploaded_files")
         .$type<{ fileName: string; fileUrl: string; uploadedAt: string }[]>()
         .default([]),
      userId: text("user_id").references(() => user.id, {
         onDelete: "cascade",
      }),
      websiteUrl: text("website_url").notNull(),
   },
   (table) => [
      index("competitor_organization_id_idx").on(table.organizationId),
      index("competitor_user_id_idx").on(table.userId),
   ],
);

export const competitorRelations = relations(competitor, ({ many }) => ({
   features: many(competitorFeature),
}));

export type CompetitorSelect = typeof competitor.$inferSelect;
export type CompetitorInsert = typeof competitor.$inferInsert;
export type KnowledgeCreationStatus =
   (typeof knowledgeCreationStatusEnum.enumValues)[number];

export type CompetitorWithFeatures = CompetitorSelect & {
   features: CompetitorFeatureSelect[];
};

export const CompetitorInsertSchema = createInsertSchema(competitor);
export const CompetitorSelectSchema = createSelectSchema(competitor);
