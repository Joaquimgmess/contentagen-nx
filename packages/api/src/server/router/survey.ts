import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { PostHog } from "posthog-node";
import { posthogHost, posthogApiKey } from "@packages/posthog/server";

// Schema de validação para bug report
export const bugReportSchema = z.object({
   // Erro que foi mostrado ao usuário
   error: z.object({
      title: z.string(),
      description: z.string(),
   }),

   // Descrição escrita pelo usuário
   userReport: z.string().min(1, "Descrição do bug é obrigatória"),

   // Mutation cache do React Query
   mutationCache: z.array(
      z.object({
         key: z.string(), // Ex: "profile.update"
         error: z.unknown(), // Erro serializado
         input: z.unknown(), // Input da mutation
      }),
   ),

   // URL onde o erro ocorreu
   currentURL: z.string(),
});

export const surveyRouter = router({
   submitBugReport: protectedProcedure
      .input(bugReportSchema)
      .mutation(async ({ ctx, input }) => {
         const resolvedCtx = await ctx;
         const userId = resolvedCtx.session?.user.id;
         const userEmail = resolvedCtx.session?.user.email;

         if (!userId) {
            throw new Error("User must be authenticated");
         }

         // 🔒 FILTRO DE SEGURANÇA: Remove senhas do mutation cache
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

         // 📊 ENVIA EVENTO PARA POSTHOG
         const posthog = new PostHog(posthogApiKey, {
            host: posthogHost,
         });

         try {
            posthog.capture({
               distinctId: userId,
               event: "bug_report_submitted",
               properties: {
                  user_id: userId,
                  user_email: userEmail,
                  error_title: input.error.title,
                  error_description: input.error.description,
                  user_report: input.userReport,
                  current_url: input.currentURL,
                  mutation_cache: sanitizedMutationCache,
                  timestamp: new Date().toISOString(),
               },
            });

            // Ensure event is sent before returning
            await posthog.shutdown();
         } catch (error) {
            console.error("Failed to send bug report to PostHog:", error);
            // Não lançamos erro para não bloquear o usuário
         }

         return { success: true };
      }),
});
