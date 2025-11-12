import { listAgents } from "@packages/database/repositories/agent-repository";
import { listContents } from "@packages/database/repositories/content-repository";
import {
   getWorkflowPreferences,
   updateWorkflowPreferences,
} from "@packages/database/repositories/user-preferences-repository";
import type { WorkflowPreferences } from "@packages/database/schemas/user-preferences";
import { APIError, propagateError } from "@packages/utils/errors";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const preferencesRouter = router({
   checkMissingImages: protectedProcedure.query(async ({ ctx }) => {
      try {
         const resolvedCtx = await ctx;
         const userId = resolvedCtx.session?.user.id;
         const organizationId =
            resolvedCtx.session?.session?.activeOrganizationId;

         if (!userId) {
            throw APIError.unauthorized("User must be authenticated.");
         }

         // Get all agents belonging to the user
         const agents = await listAgents(resolvedCtx.db, {
            organizationId: organizationId ?? "",
            userId,
         });

         if (agents.length === 0) {
            return { missingImages: [], total: 0 };
         }

         const agentIds = agents.map((agent) => agent.id);

         // Get all content for these agents that might be missing images
         const allContent = await listContents(
            resolvedCtx.db,
            agentIds,
            ["approved", "draft"], // Only check approved and draft content
         );

         // Filter content that has no imageUrl or empty imageUrl
         const missingImages = allContent.filter(
            (item) => !item.imageUrl || item.imageUrl.trim() === "",
         );

         return {
            missingImages: missingImages.map((item) => ({
               agentName:
                  item.agent?.personaConfig?.metadata?.name || "Unknown Agent",
               id: item.id,
               status: item.status,
               title: item.meta?.title || "Untitled",
            })),
            total: missingImages.length,
         };
      } catch (err) {
         console.error("Error checking for missing images:", err);
         propagateError(err);
         throw APIError.internal("Failed to check for missing images.");
      }
   }),

   // Get workflow preferences
   getWorkflow: protectedProcedure.query(async ({ ctx }) => {
      try {
         const resolvedCtx = await ctx;
         const userId = resolvedCtx.session?.user.id;
         if (!userId) {
            throw APIError.unauthorized("User must be authenticated.");
         }

         const workflowPrefs = await getWorkflowPreferences(
            resolvedCtx.db,
            userId,
         );

         return {
            notifyMissingImages: workflowPrefs?.notifyMissingImages ?? false,
            preferences: workflowPrefs || { notifyMissingImages: false },
         };
      } catch (err) {
         console.error("Error getting workflow preferences:", err);
         propagateError(err);
         throw APIError.internal("Failed to get workflow preferences.");
      }
   }),
   updateWorkflow: protectedProcedure
      .input(
         z.object({
            notifyMissingImages: z.boolean().optional(),
         }),
      )
      .mutation(async ({ ctx, input }) => {
         try {
            const resolvedCtx = await ctx;
            const userId = resolvedCtx.session?.user.id;
            if (!userId) {
               throw APIError.unauthorized("User must be authenticated.");
            }

            // Get current workflow preferences
            const currentPrefs = (await getWorkflowPreferences(
               resolvedCtx.db,
               userId,
            )) || {
               notifyMissingImages: false,
            };

            // Update with new values
            const updatedPrefs: WorkflowPreferences = {
               ...currentPrefs,
               ...input,
            };

            await updateWorkflowPreferences(
               resolvedCtx.db,
               userId,
               updatedPrefs,
            );

            return { success: true };
         } catch (err) {
            console.error("Error updating workflow preferences:", err);
            propagateError(err);
            throw APIError.internal("Failed to update workflow preferences.");
         }
      }),
});
