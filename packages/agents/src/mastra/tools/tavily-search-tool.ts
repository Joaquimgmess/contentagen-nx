import { createTool } from "@mastra/core/tools";
import { serverEnv } from "@packages/environment/server";
import { getPaymentClient } from "@packages/payment/client";
import {
   createWebSearchUsageMetadata,
   ingestBilling,
} from "@packages/payment/ingestion";
import { AppError, propagateError } from "@packages/utils/errors";
import { tavily } from "@tavily/core";
import { z } from "zod";

export function getTavilySearchInstructions(): string {
   return `
## TAVILY SEARCH TOOL
Searches the web for relevant information and sources.

**When to use:** Need to find URLs or information not in crawled content (max 2 uses per task)

**Parameters:**
- query (string): Concise search query (2-6 words)

**Examples:**
Good: "Notion features documentation", "Stripe API capabilities"
Bad: "features" (too vague), "https://example.com" (use crawl tool for URLs)
`;
}

export const tavilySearchTool = createTool({
   description: "Searches the web for relevant content",
   execute: async ({ context, runtimeContext }) => {
      const { query } = context;

      if (!runtimeContext.has("userId")) {
         throw AppError.internal("User ID is required in runtime context");
      }
      const userId = runtimeContext.get("userId") as string;
      try {
         const tavilyClient = tavily({ apiKey: serverEnv.TAVILY_API_KEY });
         const polarClient = getPaymentClient(serverEnv.POLAR_ACCESS_TOKEN);
         const searchResult = await tavilyClient.search(query, {
            autoParameters: true,
            searchDepth: "basic",
         });
         const usageData = createWebSearchUsageMetadata({
            method: "search",
         });
         await ingestBilling(polarClient, {
            externalCustomerId: userId,
            metadata: usageData,
         });
         const { results } = searchResult;
         return { results };
      } catch (error) {
         console.error(
            `Brand crawl failed for userId=${userId}, query="${query}".`,
            error,
         );
         propagateError(error);
         throw AppError.internal(
            `Search failed for userId=${userId}, query="${query}": ${(error as Error).message}`,
         );
      }
   },
   id: "tavily-search",
   inputSchema: z.object({
      query: z.string().describe("The search query"),
   }),
});
