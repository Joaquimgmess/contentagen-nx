import { eq } from "@packages/database";
import { member, organization, user } from "@packages/database/schema";
import i18n from "@packages/localization";
import { getElysiaPosthogConfig } from "@packages/posthog/server";
import { APIError } from "@packages/utils/errors";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

const posthog = getElysiaPosthogConfig();

export const bugReportSchema = z.object({
   currentURL: z.string(),
   error: z.object({
      description: z.string(),
      title: z.string(),
   }),
   mutationCache: z.array(
      z.object({
         error: z.unknown(),
         input: z.unknown(),
         key: z.string(),
      }),
   ),
   userReport: z.string().min(1),
});

export const bugReportRouter = router({
   submitBugReport: protectedProcedure
      .input(bugReportSchema)
      .mutation(async ({ ctx, input }) => {
         const resolvedCtx = await ctx;
         const userId = resolvedCtx.session?.user.id;
         const userEmail = resolvedCtx.session?.user.email;
         const locale = resolvedCtx.language || "en";

         if (!userId) {
            throw APIError.unauthorized(
               i18n.t("common.bugReport.validation.authRequired", {
                  lng: locale,
               }),
            );
         }

         const userData = await resolvedCtx.db
            .select({
               createdAt: user.createdAt,
               email: user.email,
               id: user.id,
               image: user.image,
               name: user.name,
               role: user.role,
            })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

         const userInfo = userData[0];

         const memberData = await resolvedCtx.db
            .select({
               memberRole: member.role,
               organizationId: member.organizationId,
               organizationName: organization.name,
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

         posthog.capture({
            distinctId: userId,
            event: "bug_report_submitted",
            properties: {
               current_url: input.currentURL,
               error_description: input.error.description,
               error_title: input.error.title,
               member_role: orgInfo?.memberRole || "N/A",
               mutation_cache: JSON.stringify(sanitizedMutationCache),
               organization_id: orgInfo?.organizationId || "N/A",
               organization_name: orgInfo?.organizationName || "N/A",
               timestamp: new Date().toISOString(),
               user_created_at: userInfo?.createdAt || "N/A",
               user_email: userEmail,
               user_id: userId,
               user_image: userInfo?.image || "N/A",
               user_name: userInfo?.name || "N/A",
               user_report: input.userReport,
               user_role: userInfo?.role || "N/A",
            },
         });

         await posthog.flush();

         return { success: true };
      }),
});
