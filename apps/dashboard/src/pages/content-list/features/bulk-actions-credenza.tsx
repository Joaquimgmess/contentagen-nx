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
      trpc.content.bulk.bulkApprove.mutationOptions({
         onError: (error) => {
            toast.error("Failed to approve content items");
            console.error("Bulk approve error:", error);
         },
         onSuccess: async (result) => {
            const message =
               result.totalSelected &&
               result.approvableCount &&
               result.approvableCount < result.totalSelected
                  ? `Successfully approved ${result.approvedCount} out of ${result.totalSelected} selected content items (${result.totalSelected - result.approvableCount} were already approved or in wrong status)`
                  : `Successfully approved ${result.approvedCount} content items`;
            toast.success(message);
            onOpenChange(false);
            onClearSelection();
            await queryClient.invalidateQueries({
               queryKey: trpc.content.listAllContent.queryKey(),
            });
            // Invalidate all content versions since multiple items were affected
            await queryClient.invalidateQueries({
               exact: false,
               queryKey: ["trpc", "content", "getVersions"],
            });
         },
      }),
   );

   const bulkDeleteMutation = useMutation(
      trpc.content.bulk.bulkDelete.mutationOptions({
         onError: (error) => {
            toast.error("Failed to delete content items");
            console.error("Bulk delete error:", error);
         },
         onSuccess: async (result) => {
            toast.success(
               `Successfully deleted ${result.deletedCount} content items`,
            );
            onOpenChange(false);
            onClearSelection();
            await queryClient.invalidateQueries({
               queryKey: trpc.content.listAllContent.queryKey(),
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
      bulkDeleteMutation.mutate({ ids: selectedItems });
      setShowDeleteConfirmation(false);
   };

   return (
      <>
         <Credenza onOpenChange={onOpenChange} open={open}>
            <CredenzaContent>
               <CredenzaHeader>
                  <CredenzaTitle>Bulk Actions</CredenzaTitle>
                  <CredenzaDescription>
                     Perform actions on {selectedItems.length} selected items
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

                     <span className="text-sm font-medium">Approve</span>
                     <span className="text-xs text-muted-foreground">
                        {selectedItems.length} items
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
                     <Trash2 className="h-8 w-8 " />
                     <span className="text-sm font-medium">Delete</span>
                     <span className="text-xs text-muted-foreground">
                        {selectedItems.length} items
                     </span>
                  </SquaredIconButton>
               </CredenzaBody>
            </CredenzaContent>
         </Credenza>
         <BulkDeleteConfirmationCredenza
            onConfirm={confirmBulkDelete}
            onOpenChange={setShowDeleteConfirmation}
            open={showDeleteConfirmation}
            selectedItemsCount={selectedItems.length}
         />
         <BulkApproveConfirmationCredenza
            onConfirm={confirmBulkApprove}
            onOpenChange={setShowApproveConfirmation}
            open={showApproveConfirmation}
         />
      </>
   );
}
