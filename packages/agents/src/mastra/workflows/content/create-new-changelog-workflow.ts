import { createStep, createWorkflow } from "@mastra/core";
import { createDb } from "@packages/database/client";
import { updateContent } from "@packages/database/repositories/content-repository";
import { ContentRequestSchema } from "@packages/database/schema";
import { serverEnv } from "@packages/environment/server";
import { getPaymentClient } from "@packages/payment/client";
import {
   createAiUsageMetadata,
   ingestBilling,
} from "@packages/payment/ingestion";
import { emitContentStatusChanged } from "@packages/server-events";
import { APIError, AppError, propagateError } from "@packages/utils/errors";
import {
   createDescriptionFromText,
   getKeywordsFromText,
} from "@packages/utils/text";
import { z } from "zod";
import { changelogEditorAgent } from "../../agents/changelog/changelog-editor-agent";
import { changelogReaderAgent } from "../../agents/changelog/changelog-reader-agent";
import { changelogWriterAgent } from "../../agents/changelog/changelog-writer-agent";

// Internal helper function to update content status and emit events
async function updateContentStatus(
   payload: Parameters<typeof emitContentStatusChanged>[0],
) {
   try {
      const { contentId, status, message, layout } = payload;
      const db = createDb({
         databaseUrl: serverEnv.DATABASE_URL,
      });

      await updateContent(db, contentId, {
         status,
      });

      emitContentStatusChanged({
         contentId,
         layout,
         message,
         status,
      });
   } catch (error) {
      console.error("Failed to update content status:", error);
      propagateError(error);
      throw APIError.internal("Failed to update content status");
   }
}

// LLM usage tracking
type LLMUsage = {
   inputTokens: number;
   outputTokens: number;
   totalTokens: number;
   reasoningTokens?: number | null;
   cachedInputTokens?: number | null;
};

async function ingestUsage(usage: LLMUsage, userId: string) {
   const paymentClient = getPaymentClient(serverEnv.POLAR_ACCESS_TOKEN);
   const usageMetadata = createAiUsageMetadata({
      effort: "grok-4-fast",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
   });
   await ingestBilling(paymentClient, {
      externalCustomerId: userId,
      metadata: usageMetadata,
   });
}

const CreateNewContentWorkflowInputSchema = z.object({
   agentId: z.string(),

   competitorIds: z.array(z.string()),
   contentId: z.string(),
   organizationId: z.string(),
   request: ContentRequestSchema,
   userId: z.string(),
});
const writingType = z
   .string()
   .describe("The detailed changelog draft, ready for editing");

const editorType = z
   .string()
   .describe("The edited changelog, ready for review");

const ContentWritingStepOutputSchema =
   CreateNewContentWorkflowInputSchema.extend({
      writing: writingType,
   }).omit({
      competitorIds: true,
      organizationId: true,
   });
const changelogWritingStep = createStep({
   description:
      "Write the changelog based on the content strategy and research",
   execute: async ({ inputData, runtimeContext }) => {
      try {
         const { userId, agentId, contentId, request } = inputData;

         await updateContentStatus({
            contentId,
            layout: request.layout,
            message: "Writing your changelog...",
            status: "pending",
         });

         const inputPrompt = `
create a new ${request.layout} based on the conent request.

request: ${request.description}

`;
         const result = await changelogWriterAgent.generate(
            [
               {
                  content: inputPrompt,
                  role: "user",
               },
            ],
            {
               output: ContentWritingStepOutputSchema.pick({
                  writing: true,
               }),
               runtimeContext,
            },
         );

         if (!result?.object.writing) {
            throw AppError.validation(
               'Agent output is missing "research" field',
            );
         }

         // Ingest LLM usage for billing
         if (result.usage) {
            await ingestUsage(result.usage as LLMUsage, userId);
         }

         // Update content status and emit event when writing completes
         await updateContentStatus({
            contentId,
            layout: request.layout,
            message: "Changelog draft completed",
            status: "pending",
         });

         return {
            agentId,
            contentId,
            request,
            userId,
            writing: result.object.writing,
         };
      } catch (error) {
         await updateContentStatus({
            contentId: inputData.contentId,
            layout: inputData.request.layout,
            message: "Failed to write changelog",
            status: "failed",
         });
         propagateError(error);
         throw AppError.internal(
            `Failed to write changelog: ${(error as Error).message}`,
         );
      }
   },
   id: "changelog-writing-step",
   inputSchema: CreateNewContentWorkflowInputSchema,
   outputSchema: ContentWritingStepOutputSchema,
});
const ContentEditorStepOutputSchema =
   CreateNewContentWorkflowInputSchema.extend({
      editor: editorType,
   }).omit({
      competitorIds: true,
      organizationId: true,
   });
const changelogEditorStep = createStep({
   description: "Edit the changelog based on the content research",
   execute: async ({ inputData, runtimeContext }) => {
      try {
         const { userId, request, agentId, contentId, writing } = inputData;

         // Update content status and emit event when editing starts
         await updateContentStatus({
            contentId,
            layout: request.layout,
            message: "Editing your changelog...",
            status: "pending",
         });

         const inputPrompt = `
i need you to edit this ${request.layout} draft.

writing: ${writing}

output the edited content in markdown format.
`;
         const result = await changelogEditorAgent.generate(
            [
               {
                  content: inputPrompt,
                  role: "user",
               },
            ],
            {
               output: ContentEditorStepOutputSchema.pick({
                  editor: true,
               }),
               runtimeContext,
            },
         );

         if (!result?.object.editor) {
            throw AppError.validation('Agent output is missing "editor" field');
         }

         // Ingest LLM usage for billing
         if (result.usage) {
            await ingestUsage(result.usage as LLMUsage, userId);
         }

         // Update content status and emit event when editing completes
         await updateContentStatus({
            contentId,
            layout: request.layout,
            message: "Changelog editing completed",
            status: "pending",
         });

         return {
            agentId,
            contentId,
            editor: result.object.editor,
            request,
            userId,
         };
      } catch (error) {
         await updateContentStatus({
            contentId: inputData.contentId,
            layout: inputData.request.layout,
            message: "Failed to edit changelog",
            status: "failed",
         });
         propagateError(error);
         throw AppError.internal(
            `Failed to edit changelog: ${(error as Error).message}`,
         );
      }
   },
   id: "changelog-editor-step",
   inputSchema: CreateNewContentWorkflowInputSchema.extend({
      writing: writingType,
   }),
   outputSchema: ContentEditorStepOutputSchema,
});

const ContentReviewerStepOutputSchema =
   CreateNewContentWorkflowInputSchema.extend({
      editor: editorType,
      rating: z.number().min(0).max(100),
      reasonOfTheRating: z
         .string()
         .describe("The reason for the rating, written in markdown"),
      sources: z.array(z.string()).describe("The sources found on the search"),
   }).omit({
      competitorIds: true,
      organizationId: true,
   });
export const changelogReadAndReviewStep = createStep({
   description: "Read and review the changelog",
   execute: async ({ inputData, runtimeContext }) => {
      try {
         const { userId, agentId, contentId, request, editor } = inputData;

         // Update content status and emit event when review starts
         await updateContentStatus({
            contentId,
            layout: request.layout,
            message: "Reviewing your changelog...",
            status: "pending",
         });

         const inputPrompt = `
i need you to read and review this ${request.layout}.


original:${request.description}

final:${editor}

`;
         //TODO: Rework

         const result = await changelogReaderAgent.generate(
            [
               {
                  content: inputPrompt,
                  role: "user",
               },
            ],
            {
               output: ContentReviewerStepOutputSchema.pick({
                  rating: true,
                  reasonOfTheRating: true,
               }),
               runtimeContext,
            },
         );
         if (!result?.object.rating) {
            throw AppError.validation('Agent output is missing "review" field');
         }
         if (!result?.object.reasonOfTheRating) {
            throw AppError.validation(
               'Agent output is missing "reasonOfTheRating" field',
            );
         }

         // Ingest LLM usage for billing
         if (result.usage) {
            await ingestUsage(result.usage as LLMUsage, userId);
         }

         // Update content status and emit event when review completes
         await updateContentStatus({
            contentId,
            layout: request.layout,
            message: "Changelog review completed",
            status: "pending",
         });

         return {
            agentId,
            contentId,
            editor,
            rating: result.object.rating,
            reasonOfTheRating: result.object.reasonOfTheRating,
            request,
            sources: ["Your changelog"],
            userId,
         };
      } catch (error) {
         await updateContentStatus({
            contentId: inputData.contentId,
            layout: inputData.request.layout,
            message: "Failed to review changelog",
            status: "failed",
         });
         console.error(error);
         propagateError(error);
         throw APIError.internal("Failed to review changelog");
      }
   },
   id: "changelog-read-and-review-step",
   inputSchema: ContentEditorStepOutputSchema,
   outputSchema: ContentReviewerStepOutputSchema,
});

const SeoOptimizationStepOutputSchema =
   CreateNewContentWorkflowInputSchema.extend({
      keywords: z
         .array(z.string())
         .describe(
            "The associated keywords of the content for SEO optimization",
         ),
      metaDescription: z
         .string()
         .describe("The SEO optimized meta description of the content"),
   }).omit({
      competitorIds: true,
      organizationId: true,
   });

export const changelogSeoOptimizationStep = createStep({
   description: "Generate SEO keywords and meta description for the changelog",
   execute: async ({ inputData }) => {
      try {
         const { userId, agentId, contentId, request, editor } = inputData;

         // Update content status and emit event when SEO optimization starts
         await updateContentStatus({
            contentId,
            layout: request.layout,
            message: "Optimizing SEO for your changelog...",
            status: "pending",
         });

         const keywords = getKeywordsFromText({
            minLength: 8,
            text: editor,
         });
         const metaDescription = createDescriptionFromText({
            maxLength: 180,
            text: editor,
         });
         // Update content status and emit event when SEO optimization completes
         await updateContentStatus({
            contentId,
            layout: request.layout,
            message: "SEO optimization completed",
            status: "pending",
         });

         return {
            agentId,
            contentId,
            keywords,
            metaDescription,
            request,
            userId,
         };
      } catch (error) {
         await updateContentStatus({
            contentId: inputData.contentId,
            layout: inputData.request.layout,
            message: "Failed to optimize SEO for changelog",
            status: "failed",
         });
         console.error(error);
         propagateError(error);
         throw APIError.internal("Failed to optimize SEO for changelog");
      }
   },
   id: "changelog-seo-optimization-step",
   inputSchema: ContentEditorStepOutputSchema,
   outputSchema: SeoOptimizationStepOutputSchema,
});

const FinalResultStepOutputSchema = CreateNewContentWorkflowInputSchema.extend({
   editor: editorType,
   keywords: z
      .array(z.string())
      .describe("The associated keywords of the content"),
   metaDescription: z
      .string()
      .describe(
         "The meta description, being a SEO optimized description of the article",
      ),
   rating: z.number().min(0).max(100),
   reasonOfTheRating: z
      .string()
      .describe("The reason for the rating, written in markdown"),
   sources: z.array(z.string()).describe("The sources found on the search"),
}).omit({
   competitorIds: true,
   organizationId: true,
});

export const changelogFinalResultStep = createStep({
   description: "Combine reader and SEO results into final output",
   execute: async ({ inputData }) => {
      const readerResult = inputData["changelog-read-and-review-step"];
      const seoResult = inputData["changelog-seo-optimization-step"];
      const { contentId, request } = readerResult;
      try {
         // Update content status and emit event when final result compilation starts
         await updateContentStatus({
            contentId,
            layout: request.layout,
            message: "Compiling final results...",
            status: "pending",
         });

         // Combine results - prioritize SEO keywords and meta description
         const finalResult = {
            agentId: readerResult.agentId,
            contentId: readerResult.contentId,
            editor: readerResult.editor,
            keywords: seoResult.keywords,
            metaDescription: seoResult.metaDescription,
            rating: readerResult.rating,
            reasonOfTheRating: readerResult.reasonOfTheRating,
            request: readerResult.request,
            sources: readerResult.sources,
            userId: readerResult.userId,
         };

         // Update content status and emit event when final result compilation completes

         return finalResult;
      } catch (error) {
         await updateContentStatus({
            contentId: contentId,
            layout: request.layout,
            message: "Failed to compile final results",
            status: "failed",
         });
         console.error(error);
         propagateError(error);
         throw APIError.internal("Failed to compile final results");
      }
   },
   id: "changelog-final-result-step",
   inputSchema: z.object({
      "changelog-read-and-review-step": ContentReviewerStepOutputSchema,
      "changelog-seo-optimization-step": SeoOptimizationStepOutputSchema,
   }),
   outputSchema: FinalResultStepOutputSchema,
});

export const createNewChangelogWorkflow = createWorkflow({
   description: "Create a new changelog",
   id: "create-new-changelog-workflow",
   inputSchema: CreateNewContentWorkflowInputSchema,
   outputSchema: FinalResultStepOutputSchema,
   retryConfig: {
      attempts: 3,
   },
})
   .then(changelogWritingStep)
   .then(changelogEditorStep)
   .parallel([changelogReadAndReviewStep, changelogSeoOptimizationStep])
   .then(changelogFinalResultStep)
   .commit();
