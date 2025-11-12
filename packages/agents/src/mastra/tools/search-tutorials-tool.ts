import { createTool } from "@mastra/core/tools";
import { createDb } from "@packages/database/client";
import { listAgents } from "@packages/database/repositories/agent-repository";
import { searchContent } from "@packages/database/repositories/content-repository";
import { serverEnv } from "@packages/environment/server";
import { AppError, propagateError } from "@packages/utils/errors";
import { z } from "zod";

export function getSearchTutorialsInstructions(): string {
   return `
## SEARCH TUTORIALS TOOL
Searches through all tutorials the user has written based on various criteria.

**When to use:** Need to find existing tutorials on specific topics, with certain keywords, or matching specific criteria

**Parameters:**
- query (string): Search term to look for in titles, descriptions, or content
- keywords (array of strings): Specific keywords to search for (optional)
- limit (number): Maximum number of results to return (default: 10, max: 50)

**Returns:** Array of tutorials matching the search criteria with metadata like title, description, keywords, status, and creation date

**Strategy:** Use this tool to find relevant existing tutorials before creating new content to avoid duplication and build upon existing work.
`;
}

export const searchTutorialsTool = createTool({
   description: "Searches through user's written tutorials",
   execute: async ({ context, runtimeContext }) => {
      const { query, keywords, limit = 10 } = context;

      if (!runtimeContext.has("userId")) {
         throw AppError.internal("User ID is required in runtime context");
      }
      const userId = runtimeContext.get("userId") as string;

      try {
         const dbClient = createDb({
            databaseUrl: serverEnv.DATABASE_URL,
         });

         const agents = await listAgents(dbClient, {
            limit: 20,
            userId,
         });

         const { results } = await searchContent(
            dbClient,
            agents.map((agent) => agent.id),
            query || "",
            {
               includeBody: true,
               layout: ["tutorial"],
               limit: Math.min(limit, 50),
               offset: 0,
               status: ["approved", "draft"],
            },
         );

         return {
            results,
         };
      } catch (error) {
         console.error(
            `Tutorial search failed  query="${query}", keywords=${JSON.stringify(keywords)}`,
            error,
         );
         propagateError(error);
         throw AppError.internal(
            `Tutorial search failed: ${(error as Error).message}`,
         );
      }
   },
   id: "search-tutorials",
   inputSchema: z.object({
      keywords: z
         .array(z.string())
         .optional()
         .describe("Specific keywords to search for"),
      limit: z
         .number()
         .min(1)
         .max(50)
         .default(10)
         .describe("Maximum number of results to return"),
      query: z
         .string()
         .optional()
         .describe(
            "Search term to look for in titles, descriptions, or content",
         ),
   }),
});
