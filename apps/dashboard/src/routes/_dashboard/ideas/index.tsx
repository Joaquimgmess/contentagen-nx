import { createFileRoute } from "@tanstack/react-router";
import { IdeasListPage } from "@/pages/ideas-list/ui/ideas-list-page";

export const Route = createFileRoute("/_dashboard/ideas/")({
   component: RouteComponent,
   validateSearch: (search: Record<string, unknown>) => ({
      agentId: typeof search.agentId === "string" ? search.agentId : undefined,
   }),
});

function RouteComponent() {
   const { agentId } = Route.useSearch();
   return <IdeasListPage agentId={agentId} />;
}
