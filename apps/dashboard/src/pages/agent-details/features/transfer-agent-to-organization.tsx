import { DeleteConfirmationCredenza } from "@packages/ui/components/delete-confirmation-credenza";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";

type TransferAgentToOrganizationDialogProps = {
   agentId: string;
   agentName: string;
   open: boolean;
   onOpenChange: (open: boolean) => void;
};

export function TransferAgentToOrganizationDialog({
   agentId,
   agentName,
   open,
   onOpenChange,
}: TransferAgentToOrganizationDialogProps) {
   const queryClient = useQueryClient();
   const trpc = useTRPC();

   const { mutateAsync } = useMutation(
      trpc.agent.transferToOrganization.mutationOptions({
         onError: (error) => {
            toast.error(
               error.message || "Failed to transfer agent to organization",
            );
         },
         onSuccess: async () => {
            await queryClient.invalidateQueries({
               queryKey: trpc.agent.get.queryKey(),
            });
            await queryClient.invalidateQueries({
               queryKey: trpc.agent.list.queryKey(),
            });
            toast.success("Agent transferred to organization successfully");
         },
      }),
   );

   const handleTransfer = useCallback(async () => {
      await mutateAsync({ id: agentId });
   }, [mutateAsync, agentId]);
   //TODO: Add translation
   return (
      <DeleteConfirmationCredenza
         description="This will transfer ownership of this agent to your active organization. You won't be able to undo this action."
         icon={Users}
         message={`Are you sure you want to transfer "${agentName}" to your organization? This action cannot be undone.`}
         onDelete={handleTransfer}
         onOpenChange={onOpenChange}
         open={open}
         title="Transfer Agent to Organization"
         variant="default"
      />
   );
}
