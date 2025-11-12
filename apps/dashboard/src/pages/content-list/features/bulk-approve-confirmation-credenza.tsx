import { DeleteConfirmationCredenza } from "@packages/ui/components/delete-confirmation-credenza";
import { CheckCircle } from "lucide-react";

interface BulkApproveConfirmationCredenzaProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onConfirm: () => void;
}

export function BulkApproveConfirmationCredenza({
   open,
   onOpenChange,
   onConfirm,
}: BulkApproveConfirmationCredenzaProps) {
   return (
      <DeleteConfirmationCredenza
         icon={CheckCircle}
         message={`This will approve the selected content items that are in draft or pending status. Only draft and pending items will be approved. This action will make the content publicly available.`}
         onDelete={onConfirm}
         onOpenChange={onOpenChange}
         open={open}
         variant="default"
      />
   );
}
