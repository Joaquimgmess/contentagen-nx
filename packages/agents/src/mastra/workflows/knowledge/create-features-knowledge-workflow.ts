import { createStep, createWorkflow } from "@mastra/core/workflows";
import { createDb } from "@packages/database/client";
import { bulkCreateFeatures as bulkCreateBrandFeatures } from "@packages/database/repositories/brand-feature-repository";
import { updateBrand } from "@packages/database/repositories/brand-repository";
import { bulkCreateFeatures } from "@packages/database/repositories/competitor-feature-repository";
import { serverEnv } from "@packages/environment/server";
import { createPgVector } from "@packages/rag/client";
import { createBrandKnowledgeWithEmbeddingsBulk } from "@packages/rag/repositories/brand-knowledge-repository";
import { createCompetitorKnowledgeWithEmbeddingsBulk } from "@packages/rag/repositories/competitor-knowledge-repository";
import { AppError, propagateError } from "@packages/utils/errors";
import { z } from "zod";
import { featureExtractionAgent } from "../../agents/feature-extractor-agent";
import { ingestUsage, type MastraLLMUsage } from "../../helpers";

export const CreateFeaturesKnowledgeInput = z.object({
   id: z.string(),
   target: z.enum(["brand", "competitor"]),
   userId: z.string(),
   websiteUrl: z.url(),
});

// Output schema for the workflow
export const CreateFeaturesKnowledgeOutput = z.object({
   chunkCount: z.number(),
});

const extractFeaturesKnowledgeOutputSchema =
   CreateFeaturesKnowledgeInput.extend({
      extractedFeatures: z
         .array(
            z.object({
               category: z
                  .string()
                  .describe(
                     "Functional category (e.g., 'Collaboration', 'Analytics', 'Integration', 'Security', 'Automation', 'Customization')",
                  ),
               confidence: z
                  .number()
                  .min(0)
                  .max(1)
                  .describe(
                     "Confidence score between 0 and 1 indicating certainty this is a legitimate product feature (0.8+ for clearly documented features, 0.5-0.8 for implied features, below 0.5 for uncertain)",
                  ),
               name: z
                  .string()
                  .describe(
                     "Clear, concise name for the feature (e.g., 'Real-time Collaboration', 'API Webhooks', 'Custom Reports')",
                  ),
               rawContent: z
                  .string()
                  .describe(
                     "The original text excerpt from the website that describes this feature, used as source material",
                  ),
               sourceUrl: z
                  .string()
                  .describe(
                     "The specific URL where this feature was documented or mentioned",
                  ),
               summary: z
                  .string()
                  .describe(
                     "1-3 sentence description explaining what users can do with this feature and its primary benefit",
                  ),
               tags: z
                  .array(z.string())
                  .describe(
                     "3-5 relevant keywords or technology terms associated with this feature for searchability",
                  ),
            }),
         )
         .min(10)
         .describe(
            "Array of extracted features - aim for 15+ distinct, user-facing capabilities",
         ),
   });
const extractFeaturesKnowledge = createStep({
   description: "Extract features knowledge from website",

   execute: async ({ inputData, runtimeContext }) => {
      const { userId, websiteUrl, id, target } = inputData;

      try {
         const inputPrompt = `Extract software features from: ${websiteUrl}

Focus on user-facing capabilities and actions. Target 15+ features (minimum 10).`;

         const result = await featureExtractionAgent.generate(
            [
               {
                  content: inputPrompt,
                  role: "user",
               },
            ],
            {
               output: extractFeaturesKnowledgeOutputSchema.pick({
                  extractedFeatures: true,
               }),
               runtimeContext,
            },
         );

         await ingestUsage(result.usage as MastraLLMUsage, userId);
         if (!result?.object.extractedFeatures) {
            throw AppError.validation("No features extracted from competitor");
         }

         const { extractedFeatures } = result.object;

         return {
            extractedFeatures,
            id,
            target,
            userId,
            websiteUrl,
         };
      } catch (err) {
         console.error("failed to extract features knowledge for url", err);
         propagateError(err);
         throw AppError.internal(
            "Failed to extract features knowledge from competitor website",
         );
      }
   },
   id: "extract-features-knowledge-step",
   inputSchema: CreateFeaturesKnowledgeInput,
   outputSchema: extractFeaturesKnowledgeOutputSchema,
});

const saveCompetitorFeaturesKnowledge = createStep({
   description:
      "Save competitor features knowledge to database and create embeddings",
   execute: async ({ inputData }) => {
      const { extractedFeatures, id } = inputData;

      try {
         const db = createDb({ databaseUrl: serverEnv.DATABASE_URL });
         const ragClient = createPgVector({
            pgVectorURL: serverEnv.PG_VECTOR_URL,
         });

         if (!extractedFeatures || extractedFeatures.length === 0) {
            throw AppError.validation("No features provided for saving");
         }

         const featuresForDb = extractedFeatures.map((feature) => ({
            competitorId: id,
            featureName: feature.name,
            meta: {
               category: feature.category,
               confidence: feature.confidence,
               tags: feature.tags,
            },
            rawContent: feature.rawContent,
            sourceUrl: feature.sourceUrl,
            summary: feature.summary,
         }));

         const features = await bulkCreateFeatures(db, featuresForDb);

         if (features.length === 0) {
            throw AppError.internal("No features were created in the database");
         }

         const knowledgeData = features.map((feature) => ({
            chunk: feature.summary,
            externalId: id,
            sourceId: feature.id,
            type: "feature" as const,
         }));

         await createCompetitorKnowledgeWithEmbeddingsBulk(
            ragClient,
            knowledgeData,
         );

         return {
            chunkCount: features.length,
         };
      } catch (err) {
         console.error("failed to save competitor features", err);
         propagateError(err);
         throw AppError.internal(
            "Failed to save competitor features knowledge to database and vector store",
         );
      }
   },
   id: "save-competitor-features-knowledge-step",
   inputSchema: extractFeaturesKnowledgeOutputSchema,
   outputSchema: CreateFeaturesKnowledgeOutput,
});

const saveBrandFeaturesKnowledge = createStep({
   description:
      "Save brand features knowledge to database and create embeddings",
   execute: async ({ inputData }) => {
      const { extractedFeatures, id } = inputData;
      try {
         const db = createDb({ databaseUrl: serverEnv.DATABASE_URL });
         const ragClient = createPgVector({
            pgVectorURL: serverEnv.PG_VECTOR_URL,
         });

         if (!extractedFeatures || extractedFeatures.length === 0) {
            throw AppError.validation("No features provided for saving");
         }

         const featuresForDb = extractedFeatures.map((feature) => ({
            brandId: id,
            featureName: feature.name,
            meta: {
               category: feature.category,
               confidence: feature.confidence,
               tags: feature.tags,
            },
            rawContent: feature.rawContent,
            sourceUrl: feature.sourceUrl,
            summary: feature.summary,
         }));

         const features = await bulkCreateBrandFeatures(db, featuresForDb);

         if (features.length === 0) {
            throw AppError.internal(
               "No brand features were created in the database",
            );
         }

         await updateBrand(db, id, { status: "completed" });

         const knowledgeData = features.map((feature) => ({
            chunk: feature.summary,
            externalId: id,
            sourceId: feature.id,
            type: "feature" as const,
         }));

         await createBrandKnowledgeWithEmbeddingsBulk(ragClient, knowledgeData);

         return {
            chunkCount: features.length,
         };
      } catch (err) {
         console.error("failed to save brand features", err);
         propagateError(err);
         throw AppError.internal(
            "Failed to save brand features knowledge to database and vector store",
         );
      }
   },
   id: "save-brand-features-knowledge-step",
   inputSchema: extractFeaturesKnowledgeOutputSchema,
   outputSchema: CreateFeaturesKnowledgeOutput,
});

export const createFeaturesKnowledgeWorkflow = createWorkflow({
   description: "Create features knowledge from analysis",
   id: "create-features-knowledge",
   inputSchema: CreateFeaturesKnowledgeInput,
   outputSchema: CreateFeaturesKnowledgeOutput,
})
   .then(extractFeaturesKnowledge)
   .branch([
      [
         async ({ inputData: { target } }) => target === "competitor",
         saveCompetitorFeaturesKnowledge,
      ],
      [
         async ({ inputData: { target } }) => target === "brand",
         saveBrandFeaturesKnowledge,
      ],
   ])
   .commit();
