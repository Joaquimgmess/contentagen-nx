import { z } from "zod";
import { hasGenerationCredits, organizationProcedure, router } from "../trpc";

export const assistantRouter = router({
   sendMessage: organizationProcedure
      .use(hasGenerationCredits)
      .input(
         z.object({
            message: z.string(),
         }),
      )
      .mutation(async ({ input, ctx }) => {
         try {
            const contentaSdk = (await ctx).contentaSdk;
            const stream = contentaSdk.streamAssistantResponse({
               message: input.message,
            });

            const response = [];
            for await (const chunk of stream) {
               response.push(chunk);
            }
            return response.join("");
         } catch (error) {
            console.error("Error in sendMessage:", error);
            throw new Error("Failed to process message");
         }
      }),
});
