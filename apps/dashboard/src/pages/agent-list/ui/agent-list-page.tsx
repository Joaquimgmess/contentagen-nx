import { translate } from "@packages/localization";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/integrations/clients";
import { TalkingMascot } from "@/widgets/talking-mascot/ui/talking-mascot";
import { AgentListProvider, useAgentList } from "../lib/agent-list-context";
import { AgentCard } from "./agent-card";
import { AgentListToolbar } from "./agent-list-toolbar";

function AgentListPageContent() {
   const trpc = useTRPC();
   const { page, limit } = useAgentList();
   const { data } = useSuspenseQuery(
      trpc.agent.list.queryOptions({ limit, page }),
   );

   return (
      <main className="h-full w-full flex flex-col gap-4 ">
         <TalkingMascot
            message={translate("pages.agent-list.mascot-message")}
         />
         <AgentListToolbar />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data?.items?.map((agent) => (
               <AgentCard agent={agent} key={agent.id} />
            ))}
         </div>
      </main>
   );
}

export function AgentListPage() {
   const trpc = useTRPC();
   const { data } = useSuspenseQuery(
      trpc.agent.list.queryOptions({ limit: 8, page: 1 }),
   );

   return (
      <AgentListProvider data={data}>
         <AgentListPageContent />
      </AgentListProvider>
   );
}
