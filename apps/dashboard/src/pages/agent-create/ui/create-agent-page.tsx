import { translate } from "@packages/localization";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AgentCreationManualForm } from "@/features/manual-agent-creation-form/ui/agent-creation-manual-form";
import { useTRPC } from "@/integrations/clients";
export function CreateAgentPage() {
   const navigate = useNavigate();
   const trpc = useTRPC();

   const agentMutation = useMutation(
      trpc.agent.create.mutationOptions({
         onError: (error) => {
            console.error(
               translate("pages.agent-create.messages.error-console"),
               error,
            );
            toast.error(translate("pages.agent-create.messages.error"));
         },
         onSuccess: (data) => {
            if (!data?.id) {
               throw new Error("Failed to create agent");
            }
            toast.success(translate("pages.agent-create.messages.success"));
            navigate({
               params: { agentId: data.id },
               to: "/agents/$agentId",
            });
         },
      }),
   );
   return (
      <AgentCreationManualForm
         onSubmit={async (values) => {
            await agentMutation.mutateAsync(values);
         }}
      />
   );
}
