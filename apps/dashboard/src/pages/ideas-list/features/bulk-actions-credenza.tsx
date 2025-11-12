import { translate } from "@packages/localization";
import {
   Credenza,
   CredenzaBody,
   CredenzaContent,
   CredenzaDescription,
   CredenzaHeader,
   CredenzaTitle,
} from "@packages/ui/components/credenza";
import { SquaredIconButton } from "@packages/ui/components/squared-icon-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";
import { BulkApproveConfirmationCredenza } from "./bulk-approve-confirmation-credenza";
import { BulkDeleteConfirmationCredenza } from "./bulk-delete-confirmation-credenza";

interface BulkActionsCredenzaProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   selectedItems: string[];
   onClearSelection: () => void;
}

export function BulkActionsCredenza({
   open,
   onOpenChange,
   selectedItems,
   onClearSelection,
}: BulkActionsCredenzaProps) {
   const trpc = useTRPC();
   const queryClient = useQueryClient();
   const [showApproveConfirmation, setShowApproveConfirmation] =
      useState(false);
   const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

   const bulkApproveMutation = useMutation(
      trpc.ideas.bulkApprove?.mutationOptions({
         onError: (error) => {
            toast.error(
               translate("pages.ideas-list.bulk-actions.approve.error"),
            );
            console.error("Bulk approve error:", error);
         },
         onSuccess: async (result: {
            approvedCount: number;
            totalSelected?: number;
            approvableCount?: number;
         }) => {
            const message =
               result.totalSelected &&
               result.approvableCount &&
               result.approvableCount < result.totalSelected
                  ? translate(
                       "pages.ideas-list.bulk-actions.approve.success-partial",
                       {
                          approved: result.approvedCount,
                          skipped:
                             result.totalSelected - result.approvableCount,
                          total: result.totalSelected,
                       },
                    )
                  : translate("pages.ideas-list.bulk-actions.approve.success", {
                       count: result.approvedCount,
                    });
            toast.success(message);
            onOpenChange(false);
            onClearSelection();
            await queryClient.invalidateQueries({
               queryKey: trpc.ideas.listAllIdeas.queryKey(),
            });
         },
      }),
   );

   const bulkDeleteMutation = useMutation(
      trpc.ideas.delete.mutationOptions({
         onError: (error) => {
            toast.error(
               translate("pages.ideas-list.bulk-actions.delete.error"),
            );
            console.error("Bulk delete error:", error);
         },
         onSuccess: async () => {
            toast.success(
               translate("pages.ideas-list.bulk-actions.delete.success"),
            );
            onOpenChange(false);
            onClearSelection();
            await queryClient.invalidateQueries({
               queryKey: trpc.ideas.listAllIdeas.queryKey(),
            });
         },
      }),
   );

   const handleBulkApprove = () => {
      if (selectedItems.length === 0) return;
      setShowApproveConfirmation(true);
   };

   const handleBulkDelete = () => {
      if (selectedItems.length === 0) return;
      setShowDeleteConfirmation(true);
   };

   const confirmBulkApprove = () => {
      bulkApproveMutation.mutate({ ids: selectedItems });
      setShowApproveConfirmation(false);
   };

   const confirmBulkDelete = () => {
      // Delete ideas one by one since there's no bulk delete endpoint
      selectedItems.forEach((id) => {
         bulkDeleteMutation.mutate({ id });
      });
      setShowDeleteConfirmation(false);
   };

   return (
      <>
         <Credenza onOpenChange={onOpenChange} open={open}>
            <CredenzaContent>
               <CredenzaHeader>
                  <CredenzaTitle>
                     {translate("pages.ideas-list.bulk-actions.title")}
                  </CredenzaTitle>
                  <CredenzaDescription>
                     {translate("pages.ideas-list.bulk-actions.description", {
                        count: selectedItems.length,
                     })}
                  </CredenzaDescription>
               </CredenzaHeader>
               <CredenzaBody className="grid grid-cols-2 gap-4">
                  <SquaredIconButton
                     disabled={
                        bulkApproveMutation.isPending ||
                        bulkDeleteMutation.isPending ||
                        selectedItems.length === 0
                     }
                     onClick={handleBulkApprove}
                  >
                     <CheckCircle className="h-8 w-8" />
                     <span className="text-sm font-medium">
                        {translate(
                           "pages.ideas-list.bulk-actions.approve.label",
                        )}
                     </span>
                     <span className="text-xs text-muted-foreground">
                        {translate(
                           "pages.ideas-list.bulk-actions.approve.items",
                           { count: selectedItems.length },
                        )}
                     </span>
                  </SquaredIconButton>

                  <SquaredIconButton
                     destructive
                     disabled={
                        bulkApproveMutation.isPending ||
                        bulkDeleteMutation.isPending ||
                        selectedItems.length === 0
                     }
                     onClick={handleBulkDelete}
                  >
                     <Trash2 className="h-8 w-8" />
                     <span className="text-sm font-medium">
                        {translate(
                           "pages.ideas-list.bulk-actions.delete.label",
                        )}
                     </span>
                     <span className="text-xs text-muted-foreground">
                        {translate(
                           "pages.ideas-list.bulk-actions.delete.items",
                           { count: selectedItems.length },
                        )}
                     </span>
                  </SquaredIconButton>
               </CredenzaBody>
            </CredenzaContent>
         </Credenza>
         <BulkApproveConfirmationCredenza
            onConfirm={confirmBulkApprove}
            onOpenChange={setShowApproveConfirmation}
            open={showApproveConfirmation}
         />
         <BulkDeleteConfirmationCredenza
            onConfirm={confirmBulkDelete}
            onOpenChange={setShowDeleteConfirmation}
            open={showDeleteConfirmation}
            selectedItemsCount={selectedItems.length}
         />
      </>
   );
}
