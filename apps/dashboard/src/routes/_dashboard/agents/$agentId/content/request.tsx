import { createFileRoute } from "@tanstack/react-router";
import { AgentContentRequestPage } from "@/pages/create-content/ui/create-content-request-page";

export const Route = createFileRoute(
   "/_dashboard/agents/$agentId/content/request",
)({
   component: RouteComponent,
});

function RouteComponent() {
   return <AgentContentRequestPage />;
}
