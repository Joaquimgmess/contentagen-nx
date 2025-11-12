import { DeleteConfirmationCredenza } from "@packages/ui/components/delete-confirmation-credenza";

interface ContentDeleteConfirmationCredenzaProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   contentTitle: string;
   onConfirm: () => void;
}

export function ContentDeleteConfirmationCredenza({
   open,
   onOpenChange,
   contentTitle,
   onConfirm,
}: ContentDeleteConfirmationCredenzaProps) {
   return (
      <DeleteConfirmationCredenza
         message={`This will permanently delete "${contentTitle}" and all associated data. This action cannot be undone.`}
         onDelete={onConfirm}
         onOpenChange={onOpenChange}
         open={open}
      />
   );
}
