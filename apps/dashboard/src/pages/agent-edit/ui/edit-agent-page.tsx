import { translate } from "@packages/localization";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { AgentCreationManualForm } from "@/features/manual-agent-creation-form/ui/agent-creation-manual-form";
import { useTRPC } from "@/integrations/clients";
export function EditAgentPage() {
   const navigate = useNavigate();
   const trpc = useTRPC();
   const { agentId } = useParams({
      from: "/_dashboard/agents/$agentId/edit",
   });
   const agentMutation = useMutation(
      trpc.agent.update.mutationOptions({
         onError: (error) => {
            console.error(
               translate("pages.agent-edit.messages.error-console"),
               error,
            );
            toast.error(translate("pages.agent-edit.messages.error"));
         },
         onSuccess: () => {
            toast.success(translate("pages.agent-edit.messages.success"));
            navigate({
               to: "/agents",
            });
         },
      }),
   );

   const { data: agent } = useSuspenseQuery(
      trpc.agent.get.queryOptions({ id: agentId }),
   );

   return (
      <AgentCreationManualForm
         defaultValues={{ ...agent.personaConfig }}
         mode="edit"
         onSubmit={async (values) => {
            await agentMutation.mutateAsync({
               id: agentId,
               personaConfig: {
                  ...values,
               },
            });
         }}
      />
   );
}
