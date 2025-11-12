import { Button } from "@packages/ui/components/button";
import {
   Credenza,
   CredenzaBody,
   CredenzaContent,
   CredenzaDescription,
   CredenzaHeader,
   CredenzaTitle,
} from "@packages/ui/components/credenza";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTRPC } from "@/integrations/clients";
import { AgentWriterCard } from "@/widgets/agent-display-card/ui/agent-writter-card";

export function CreateContentCredenza({
   open,
   onOpenChange,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}) {
   const trpc = useTRPC();
   const { data, isLoading } = useSuspenseQuery(trpc.agent.list.queryOptions());
   const userHasAgents = useMemo(
      () => !!(data && data.items.length > 0),
      [data],
   );

   return (
      <Credenza onOpenChange={onOpenChange} open={open}>
         <CredenzaContent>
            <CredenzaHeader>
               <CredenzaTitle>Select Agent</CredenzaTitle>
               <CredenzaDescription>
                  Choose an agent to create content with. If you don't have any
                  agents, you can create one.
               </CredenzaDescription>
            </CredenzaHeader>
            <CredenzaBody className="grid grid-cols-1 gap-2">
               {isLoading && <Skeleton className="w-full h-16 mb-2" />}
               {!isLoading && !userHasAgents && (
                  <Link
                     className="w-full flex justify-center"
                     to="/agents/manual"
                  >
                     <Button className="w-full" variant="default">
                        No agents found. Create one
                     </Button>
                  </Link>
               )}
               {!isLoading &&
                  userHasAgents &&
                  data.items.map((agent) => (
                     <Link
                        key={agent.id}
                        params={{ agentId: agent.id }}
                        to={"/agents/$agentId/content/request"}
                     >
                        <AgentWriterCard
                           description={
                              agent.personaConfig.metadata.description
                           }
                           name={agent.personaConfig.metadata.name}
                        />
                     </Link>
                  ))}
            </CredenzaBody>
         </CredenzaContent>
      </Credenza>
   );
}
