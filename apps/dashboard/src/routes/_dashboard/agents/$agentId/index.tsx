import { createFileRoute } from "@tanstack/react-router";
import { AgentDetailsPage } from "@/pages/agent-details/ui/agent-details-page";

export const Route = createFileRoute("/_dashboard/agents/$agentId/")({
   component: AgentDetailsPage,
   loader: async ({ context, params }) => {
      const { agentId } = params;
      const { trpc, queryClient } = context;
      await queryClient.ensureQueryData(
         trpc.agent.get.queryOptions({ id: agentId }),
      );
   },
});
