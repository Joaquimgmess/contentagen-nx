import type { CompetitorSelect } from "@packages/database/schema";
import { translate } from "@packages/localization";
import { DeleteConfirmationCredenza } from "@packages/ui/components/delete-confirmation-credenza";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";

interface DeleteCompetitorConfirmationDialogProps {
   competitor: CompetitorSelect;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function DeleteCompetitorConfirmationDialog({
   competitor,
   open,
   onOpenChange,
}: DeleteCompetitorConfirmationDialogProps) {
   const trpc = useTRPC();
   const queryClient = useQueryClient();

   const deleteCompetitorMutation = useMutation(
      trpc.competitor.delete.mutationOptions({
         onError: (error) => {
            toast.error(
               translate("pages.competitor-list.messages.delete-error", {
                  error: error.message,
               }),
            );
         },
         onSuccess: () => {
            toast.success(
               translate("pages.competitor-list.messages.delete-success", {
                  name: competitor.name,
               }),
            );
            queryClient.invalidateQueries({
               queryKey: trpc.competitor.list.queryKey(),
            });
            onOpenChange(false);
         },
      }),
   );

   const handleDelete = () => {
      deleteCompetitorMutation.mutate({ id: competitor.id });
   };

   return (
      <DeleteConfirmationCredenza
         icon={AlertTriangleIcon}
         message={translate("pages.competitor-list.modals.delete.description", {
            name: competitor.name,
         })}
         onCancel={() => onOpenChange(false)}
         onDelete={handleDelete}
         onOpenChange={onOpenChange}
         open={open}
         title={translate("pages.competitor-list.modals.delete.title")}
         variant="destructive"
      />
   );
}
