import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { PostHog } from "posthog-node";
import { posthogHost, posthogApiKey } from "@packages/posthog/server";
import { eq } from "drizzle-orm";
import { user, organization, member } from "@packages/database/schema";

export const bugReportSchema = z.object({
   error: z.object({
      title: z.string(),
      description: z.string(),
   }),
   userReport: z.string().min(1, "Descrição do bug é obrigatória"),
   mutationCache: z.array(
      z.object({
         key: z.string(),
         error: z.unknown(),
         input: z.unknown(),
      }),
   ),
   currentURL: z.string(),
});

export const bugReportRouter = router({
   submitBugReport: protectedProcedure
      .input(bugReportSchema)
      .mutation(async ({ ctx, input }) => {
         const resolvedCtx = await ctx;
         const userId = resolvedCtx.session?.user.id;
         const userEmail = resolvedCtx.session?.user.email;

         if (!userId) {
            throw new Error("User must be authenticated");
         }

         const userData = await resolvedCtx.db
            .select({
               id: user.id,
               name: user.name,
               email: user.email,
               role: user.role,
               createdAt: user.createdAt,
               image: user.image,
            })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

         const userInfo = userData[0];

         const memberData = await resolvedCtx.db
            .select({
               organizationId: member.organizationId,
               organizationName: organization.name,
               memberRole: member.role,
            })
            .from(member)
            .innerJoin(organization, eq(member.organizationId, organization.id))
            .where(eq(member.userId, userId))
            .limit(1);

         const orgInfo = memberData[0];

         const sanitizedMutationCache = input.mutationCache.map((mutation) => {
            if (mutation.input && typeof mutation.input === "object") {
               const sanitizedInput = Object.fromEntries(
                  Object.entries(mutation.input).filter(
                     ([key]) => !["password", "confirmPassword"].includes(key),
                  ),
               );
               return {
                  ...mutation,
                  input: sanitizedInput,
               };
            }
            return mutation;
         });

         const posthog = new PostHog(posthogApiKey, {
            host: posthogHost,
         });

         posthog.capture({
            distinctId: userId,
            event: "bug_report_submitted",
            properties: {
               user_id: userId,
               user_email: userEmail,
               user_name: userInfo?.name || "N/A",
               user_role: userInfo?.role || "N/A",
               user_created_at: userInfo?.createdAt || "N/A",
               user_image: userInfo?.image || "N/A",
               organization_id: orgInfo?.organizationId || "N/A",
               organization_name: orgInfo?.organizationName || "N/A",
               member_role: orgInfo?.memberRole || "N/A",
               error_title: input.error.title,
               error_description: input.error.description,
               user_report: input.userReport,
               current_url: input.currentURL,
               mutation_cache: JSON.stringify(sanitizedMutationCache),
               mutation_cache_count: sanitizedMutationCache.length,
               timestamp: new Date().toISOString(),
            },
         });

         await posthog.shutdown();

         return { success: true };
      }),
});
