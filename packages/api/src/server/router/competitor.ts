import { on } from "node:events";
import { getBrandByOrgId } from "@packages/database/repositories/brand-repository";
import {
   deleteFeaturesByCompetitorId,
   getFeaturesByCompetitorId,
   getTotalFeaturesByCompetitorId,
} from "@packages/database/repositories/competitor-feature-repository";
import {
   createCompetitor,
   deleteCompetitor,
   getCompetitorById,
   getRandomFindingsFromCompetitors,
   getTotalCompetitors,
   listCompetitors,
   searchCompetitors,
   updateCompetitor,
} from "@packages/database/repositories/competitor-repository";
import { CompetitorInsertSchema } from "@packages/database/schema";
import {
   type CompetitorStatusChangedPayload,
   EVENTS,
   eventEmitter,
} from "@packages/server-events";
import { APIError, propagateError } from "@packages/utils/errors";
import { enqueueCreateCompetitorInsightsJob } from "@packages/workers/queues/create-competitor-insights-queue";
import { enqueueCreateCompleteKnowledgeWorkflowJob } from "@packages/workers/queues/create-complete-knowledge-workflow-queue";
import { enqueueCreateFeaturesKnowledgeJob } from "@packages/workers/queues/create-features-knowledge-queue";
import { z } from "zod";
import {
   hasGenerationCredits,
   organizationOwnerProcedure,
   organizationProcedure,
   protectedProcedure,
   publicProcedure,
   router,
} from "../trpc";

export const competitorRouter = router({
   analyze: organizationProcedure
      .use(hasGenerationCredits)

      .input(z.object({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            const organizationId =
               resolvedCtx.session?.session?.activeOrganizationId;

            if (!userId || !organizationId) {
               throw APIError.unauthorized(
                  "User must be authenticated and belong to an organization to analyze competitors.",
               );
            }

            const competitor = await getCompetitorById(
               resolvedCtx.db,
               input.id,
            );

            // Verify the competitor belongs to the user/organization
            if (
               competitor.userId !== userId &&
               competitor.organizationId !== organizationId
            ) {
               throw APIError.forbidden(
                  "You don't have permission to analyze this competitor.",
               );
            }

            await deleteFeaturesByCompetitorId(resolvedCtx.db, competitor.id);

            await enqueueCreateFeaturesKnowledgeJob({
               id: competitor.id,
               target: "competitor",
               userId,
               websiteUrl: competitor.websiteUrl,
            });
            return { success: true };
         } catch (err) {
            console.error("Error analyzing competitor:", err);
            propagateError(err);
            throw APIError.internal("Failed to analyze competitor.");
         }
      }),

   create: organizationOwnerProcedure
      .use(hasGenerationCredits)
      .input(
         CompetitorInsertSchema.pick({
            websiteUrl: true,
         }),
      )
      .mutation(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            const organizationId =
               resolvedCtx.session?.session?.activeOrganizationId;

            if (!userId || !organizationId) {
               throw APIError.unauthorized(
                  "User must be authenticated and belong to an organization to create competitors.",
               );
            }

            const created = await createCompetitor(resolvedCtx.db, {
               ...input,
               organizationId,
               userId,
            });
            await enqueueCreateCompleteKnowledgeWorkflowJob({
               id: created.id,
               runtimeContext: {
                  language: resolvedCtx.language,
                  userId,
               },
               target: "competitor",
               userId,
               websiteUrl: input.websiteUrl,
            });

            return created;
         } catch (err) {
            console.error("Error creating competitor:", err);
            propagateError(err);
            throw APIError.internal("Failed to create competitor.");
         }
      }),

   delete: protectedProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            const organizationId =
               resolvedCtx.session?.session?.activeOrganizationId;

            if (!userId || !organizationId) {
               throw APIError.unauthorized(
                  "User must be authenticated and belong to an organization to delete competitors.",
               );
            }

            // Verify the competitor exists and belongs to the user/organization
            const existing = await getCompetitorById(resolvedCtx.db, input.id);
            if (
               existing.userId !== userId &&
               existing.organizationId !== organizationId
            ) {
               throw APIError.forbidden(
                  "You don't have permission to delete this competitor.",
               );
            }

            await deleteCompetitor(resolvedCtx.db, input.id);
            return { success: true };
         } catch (err) {
            console.error("Error deleting competitor:", err);
            propagateError(err);
            throw APIError.internal("Failed to delete competitor.");
         }
      }),
   generateInsights: organizationProcedure
      .use(hasGenerationCredits)
      .input(z.object({ competitorId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            const organizationId =
               resolvedCtx.session?.session?.activeOrganizationId;

            if (!userId || !organizationId) {
               throw APIError.unauthorized(
                  "User must be authenticated and belong to an organization to generate competitor insights.",
               );
            }

            const competitor = await getCompetitorById(
               resolvedCtx.db,
               input.competitorId,
            );

            // Verify the competitor belongs to the user/organization
            if (
               competitor.userId !== userId &&
               competitor.organizationId !== organizationId
            ) {
               throw APIError.forbidden(
                  "You don't have permission to generate insights for this competitor.",
               );
            }

            const brand = await getBrandByOrgId(resolvedCtx.db, organizationId);
            if (!brand) {
               throw APIError.notFound(
                  "Active brand not found for organization.",
               );
            }

            // Enqueue background job to generate the insights
            await enqueueCreateCompetitorInsightsJob({
               competitorId: input.competitorId,
               organizationId,
               runtimeContext: {
                  brandId: brand.id,
                  language: resolvedCtx.language,
                  userId,
               },
               userId,
            });

            // Return success - the insights will be generated asynchronously
            return { competitorId: input.competitorId, success: true };
         } catch (err) {
            console.error("Error generating competitor insights:", err);
            propagateError(err);
            throw APIError.internal("Failed to generate competitor insights.");
         }
      }),

   get: protectedProcedure
      .input(z.object({ id: z.uuid() }))
      .query(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            const organizationId =
               resolvedCtx.session?.session?.activeOrganizationId;

            if (!userId || !organizationId) {
               throw APIError.unauthorized(
                  "User must be authenticated and belong to an organization to view competitors.",
               );
            }

            const competitor = await getCompetitorById(
               resolvedCtx.db,
               input.id,
            );

            // Verify the competitor belongs to the user/organization
            if (
               competitor.userId !== userId &&
               competitor.organizationId !== organizationId
            ) {
               throw APIError.forbidden(
                  "You don't have permission to view this competitor.",
               );
            }

            return competitor;
         } catch (err) {
            console.error("Error getting competitor:", err);
            propagateError(err);
            throw APIError.internal("Failed to get competitor.");
         }
      }),

   getFeatures: protectedProcedure
      .input(
         z.object({
            competitorId: z.uuid(),
            limit: z.number().min(1).max(100).optional().default(12),
            page: z.number().min(1).optional().default(1),
            sortBy: z
               .enum(["extractedAt", "featureName"])
               .optional()
               .default("extractedAt"),
            sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
         }),
      )
      .query(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            const organizationId =
               resolvedCtx.session?.session?.activeOrganizationId;

            if (!userId || !organizationId) {
               throw APIError.unauthorized(
                  "User must be authenticated and belong to an organization to view competitor features.",
               );
            }

            // Verify the competitor exists and belongs to the user/organization
            const competitor = await getCompetitorById(
               resolvedCtx.db,
               input.competitorId,
            );
            if (
               competitor.userId !== userId &&
               competitor.organizationId !== organizationId
            ) {
               throw APIError.forbidden(
                  "You don't have permission to view this competitor's features.",
               );
            }

            const [features, total] = await Promise.all([
               getFeaturesByCompetitorId(resolvedCtx.db, input.competitorId, {
                  limit: input.limit,
                  page: input.page,
                  sortBy: input.sortBy,
                  sortOrder: input.sortOrder,
               }),
               getTotalFeaturesByCompetitorId(
                  resolvedCtx.db,
                  input.competitorId,
               ),
            ]);

            const totalPages = Math.ceil(total / input.limit);

            return {
               features,
               limit: input.limit,
               page: input.page,
               total,
               totalPages,
            };
         } catch (err) {
            console.error("Error getting competitor features:", err);
            propagateError(err);
            throw APIError.internal("Failed to get competitor features.");
         }
      }),

   getRandomFindings: organizationProcedure.query(async ({ ctx }) => {
      try {
         const resolvedCtx = await ctx;
         const organizationId =
            resolvedCtx.session?.session?.activeOrganizationId;

         if (!organizationId) {
            return {
               findings: [] as string[],
               insights: [] as string[],
               priorities: [] as string[],
            };
         }

         const findings = await getRandomFindingsFromCompetitors(
            resolvedCtx.db,
            organizationId,
            3,
         );

         return findings;
      } catch (err) {
         console.error("Error getting random findings:", err);
         propagateError(err);
         throw APIError.internal("Failed to get random findings.");
      }
   }),

   list: protectedProcedure
      .input(
         z.object({
            limit: z.number().min(1).max(100).optional().default(20),
            page: z.number().min(1).optional().default(1),
            search: z.string().optional(),
         }),
      )
      .query(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            const organizationId =
               resolvedCtx.session?.session?.activeOrganizationId;

            if (!userId) {
               throw APIError.unauthorized("User must be authenticated.");
            }

            const competitors = await listCompetitors(resolvedCtx.db, {
               limit: input.limit,
               organizationId: organizationId || undefined,
               page: input.page,
               userId,
            });

            const total = await getTotalCompetitors(resolvedCtx.db, {
               organizationId: organizationId || undefined,
               userId,
            });

            return {
               items: competitors,
               limit: input.limit,
               page: input.page,
               total,
            };
         } catch (err) {
            console.error("Error listing competitors:", err);
            propagateError(err);
            throw APIError.internal("Failed to list competitors.");
         }
      }),
   onStatusChange: publicProcedure
      .input(z.object({ competitorId: z.string().optional() }).optional())
      .subscription(async function* (opts) {
         for await (const [payload] of on(
            eventEmitter,
            EVENTS.competitorStatus,
            {
               signal: opts.signal,
            },
         )) {
            const event = payload as CompetitorStatusChangedPayload;
            if (
               !opts.input?.competitorId ||
               opts.input.competitorId === event.competitorId
            ) {
               yield event;
            }
         }
      }),

   search: protectedProcedure
      .input(
         z.object({
            limit: z.number().min(1).max(100).optional().default(20),
            page: z.number().min(1).optional().default(1),
            query: z.string().min(1),
         }),
      )
      .query(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            const organizationId =
               resolvedCtx.session?.session?.activeOrganizationId;

            if (!userId) {
               throw APIError.unauthorized("User must be authenticated.");
            }

            const competitors = await searchCompetitors(resolvedCtx.db, {
               limit: input.limit,
               organizationId: organizationId || undefined,
               page: input.page,
               query: input.query,
               userId,
            });
            return { items: competitors };
         } catch (err) {
            console.error("Error searching competitors:", err);
            propagateError(err);
            throw APIError.internal("Failed to search competitors.");
         }
      }),

   update: protectedProcedure
      .input(
         z.object({
            data: CompetitorInsertSchema.pick({
               name: true,
               websiteUrl: true,
            }).partial(),
            id: z.uuid(),
         }),
      )
      .mutation(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            const organizationId =
               resolvedCtx.session?.session?.activeOrganizationId;

            if (!userId || !organizationId) {
               throw APIError.unauthorized(
                  "User must be authenticated and belong to an organization to update competitors.",
               );
            }

            // Verify the competitor exists and belongs to the user/organization
            const existing = await getCompetitorById(resolvedCtx.db, input.id);
            if (
               existing.userId !== userId &&
               existing.organizationId !== organizationId
            ) {
               throw APIError.forbidden(
                  "You don't have permission to update this competitor.",
               );
            }

            const updated = await updateCompetitor(
               resolvedCtx.db,
               input.id,
               input.data,
            );
            return updated;
         } catch (err) {
            console.error("Error updating competitor:", err);
            propagateError(err);
            throw APIError.internal("Failed to update competitor.");
         }
      }),
});
