import { translate } from "@packages/localization";
import { DeleteConfirmationCredenza } from "@packages/ui/components/delete-confirmation-credenza";

interface DeleteConfirmationCredenzaProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onConfirm: () => void;
}

export function IdeaDeleteConfirmationCredenza({
   open,
   onOpenChange,
   onConfirm,
}: DeleteConfirmationCredenzaProps) {
   return (
      <DeleteConfirmationCredenza
         message={translate("pages.idea-details.confirmations.delete-message")}
         onDelete={onConfirm}
         onOpenChange={onOpenChange}
         open={open}
      />
   );
}
