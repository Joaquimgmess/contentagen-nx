import { translate } from "@packages/localization";
import { DeleteConfirmationCredenza } from "@packages/ui/components/delete-confirmation-credenza";
import { CheckCircle } from "lucide-react";

interface ApproveConfirmationCredenzaProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onConfirm: () => void;
}

export function ApproveConfirmationCredenza({
   open,
   onOpenChange,
   onConfirm,
}: ApproveConfirmationCredenzaProps) {
   return (
      <DeleteConfirmationCredenza
         icon={CheckCircle}
         message={translate("pages.idea-details.confirmations.approve-message")}
         onDelete={onConfirm}
         onOpenChange={onOpenChange}
         open={open}
         variant="default"
      />
   );
}
