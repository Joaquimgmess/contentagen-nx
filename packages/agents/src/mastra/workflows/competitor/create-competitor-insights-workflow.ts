import { createStep, createWorkflow } from "@mastra/core/workflows";
import { createDb } from "@packages/database/client";
import { updateCompetitor } from "@packages/database/repositories/competitor-repository";
import { CompetitorFindingsSchema } from "@packages/database/schema";
import { serverEnv } from "@packages/environment/server";
import { z } from "zod";
import { competitorIntelligenceAgent } from "../../agents/competitor-intelligence-agent";
import { ingestUsage, type MastraLLMUsage } from "../../helpers";

export const CreateCompetitorInsightsInput = z.object({
   competitorId: z.string(),
   organizationId: z.string(),
   userId: z.string(),
});

export const CreateCompetitorInsightsOutput = z.object({
   competitorId: z.string(),
   findings: CompetitorFindingsSchema,
});

// Step 1: Generate insights for a single competitor using AI
const generateInsights = createStep({
   description: "Generate competitor insights and priorities using AI analysis",

   execute: async ({ inputData, runtimeContext }) => {
      const { organizationId, userId, competitorId } = inputData;

      try {
         const inputPrompt = `
Based on the competitor with ID: ${competitorId}, please analyze this competitor and generate structured insights and priorities.

Generate:
1. Key insights about this competitor's strategies, features, or market position
2. Actionable priorities based on the competitive analysis, ordered by importance

Return the results as JSON with:
- insights: array of strings (key insights about the competitor)
- priorities: array of strings (actionable recommendations ordered by importance)

Focus on specific, actionable intelligence that would be valuable for strategic planning.
`;

         const result = await competitorIntelligenceAgent.generate(
            [
               {
                  content: inputPrompt,
                  role: "user",
               },
            ],
            {
               output: CompetitorFindingsSchema,
               runtimeContext,
            },
         );

         // Charge user for AI usage
         await ingestUsage(result.usage as MastraLLMUsage, userId);

         if (!result?.object) {
            throw new Error(
               "Failed to generate competitor insights - no insights content returned",
            );
         }

         return {
            competitorId,
            findings: result.object,
            organizationId,
            userId,
         };
      } catch (err) {
         console.error("Failed to generate competitor insights:", err);
         throw new Error(
            `Competitor insights generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
         );
      }
   },
   id: "generate-insights-step",
   inputSchema: CreateCompetitorInsightsInput,
   outputSchema: CreateCompetitorInsightsInput.extend({
      findings: CompetitorFindingsSchema,
   }),
});

// Step 2: Save the insights to competitor table
const saveInsights = createStep({
   description: "Save the generated insights to the competitor table",

   execute: async ({ inputData }) => {
      const { competitorId, findings } = inputData;

      try {
         const db = createDb({ databaseUrl: serverEnv.DATABASE_URL });

         await updateCompetitor(db, competitorId, {
            findings,
         });

         return {
            competitorId,
            findings,
         };
      } catch (err) {
         console.error("Failed to save competitor insights:", err);
         throw new Error(
            `Failed to save insights to database: ${err instanceof Error ? err.message : "Unknown error"}`,
         );
      }
   },
   id: "save-insights-step",
   inputSchema: CreateCompetitorInsightsInput.extend({
      findings: CompetitorFindingsSchema,
   }),
   outputSchema: CreateCompetitorInsightsOutput,
});

export const createCompetitorInsightsWorkflow = createWorkflow({
   description:
      "Generate competitor insights and priorities from competitive analysis",
   id: "create-competitor-insights",
   inputSchema: CreateCompetitorInsightsInput,
   outputSchema: CreateCompetitorInsightsOutput,
})
   .then(generateInsights)
   .then(saveInsights)
   .commit();
