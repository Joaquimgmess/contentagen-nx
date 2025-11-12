import {
   getTotalAgents,
   listAgents,
} from "@packages/database/repositories/agent-repository";
import { getContentStatsLast30Days } from "@packages/database/repositories/content-repository";
import { protectedProcedure, router } from "../trpc";

export const statisticsRouter = router({
   getHomeStats: protectedProcedure.query(async ({ ctx }) => {
      const resolvedCtx = await ctx;
      const db = resolvedCtx.db;
      const userId = resolvedCtx.session?.user.id;
      const organizationId = resolvedCtx.session?.session?.activeOrganizationId;
      // Get agents for user/org
      const totalAgents = await getTotalAgents(db, {
         organizationId: organizationId ?? "",
         userId,
      });
      const agents = await listAgents(db, {
         organizationId: organizationId ?? "",
         userId,
      });
      const agentIds = agents.map((a) => a.id);
      // Get content stats for last 30 days
      const contentStats = await getContentStatsLast30Days(db, agentIds, [
         "approved",
         "draft",
      ]);
      return {
         contentGenerated: contentStats.count,
         totalAgents,
         wordCount30d: contentStats.wordsCount,
      };
   }),
});
