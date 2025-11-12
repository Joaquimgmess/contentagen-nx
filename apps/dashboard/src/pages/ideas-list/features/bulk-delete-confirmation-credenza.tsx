import { DeleteConfirmationCredenza } from "@packages/ui/components/delete-confirmation-credenza";

interface BulkDeleteConfirmationCredenzaProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   selectedItemsCount: number;
   onConfirm: () => void;
}

export function BulkDeleteConfirmationCredenza({
   open,
   onOpenChange,
   selectedItemsCount,
   onConfirm,
}: BulkDeleteConfirmationCredenzaProps) {
   return (
      <DeleteConfirmationCredenza
         message={`This will permanently delete ${selectedItemsCount} idea${
            selectedItemsCount > 1 ? "s" : ""
         } and all associated data. This action cannot be undone.`}
         onDelete={onConfirm}
         onOpenChange={onOpenChange}
         open={open}
      />
   );
}
