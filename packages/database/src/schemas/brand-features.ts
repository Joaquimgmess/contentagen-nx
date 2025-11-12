import { relations } from "drizzle-orm";
import {
   index,
   jsonb,
   pgTable,
   text,
   timestamp,
   uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";
import { brand } from "./brand";

export const BrandFeatureMetaSchema = z.object({
   category: z
      .string()
      .describe(
         "Type of feature (e.g., 'User Interface', 'Analytics', 'Integration', etc.)",
      )
      .optional(),
   confidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Confidence level that this is a real feature (0-1)")
      .optional(),
   tags: z
      .array(z.string())
      .optional()
      .describe("Relevant keywords or tags for this feature"),
});
export type BrandFeatureMeta = z.infer<typeof BrandFeatureMetaSchema>;

export const brandFeature = pgTable(
   "brand_feature",
   {
      brandId: uuid("brand_id")
         .notNull()
         .references(() => brand.id, { onDelete: "cascade" }),
      extractedAt: timestamp("extracted_at").defaultNow().notNull(),
      featureName: text("feature_name").notNull(),
      id: uuid("id").primaryKey().defaultRandom(),
      meta: jsonb("meta").$type<BrandFeatureMeta>().default({}),
      rawContent: text("raw_content").notNull(),
      sourceUrl: text("source_url"),
      summary: text("summary").notNull(),
   },
   (table) => [
      index("brand_feature_brand_id_feature_name_idx").on(
         table.brandId,
         table.featureName,
      ),
   ],
);

export const brandFeatureRelations = relations(brandFeature, ({ one }) => ({
   brand: one(brand, {
      fields: [brandFeature.brandId],
      references: [brand.id],
   }),
}));

export type BrandFeatureSelect = typeof brandFeature.$inferSelect;
export type BrandFeatureInsert = typeof brandFeature.$inferInsert;

export const BrandFeatureInsertSchema = createInsertSchema(brandFeature);
export const BrandFeatureSelectSchema = createSelectSchema(brandFeature);
