import { translate } from "@packages/localization";
import { Button } from "@packages/ui/components/button";
import {
   Credenza,
   CredenzaBody,
   CredenzaContent,
   CredenzaDescription,
   CredenzaFooter,
   CredenzaHeader,
   CredenzaTitle,
} from "@packages/ui/components/credenza";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { betterAuthClient, useTRPC } from "@/integrations/clients";
export function DeleteApiKeyCredenza({
   open,
   onOpenChange,
   keyId,
}: {
   keyId: string;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}) {
   const handleCancel = useCallback(() => {
      onOpenChange(false);
   }, [onOpenChange]);
   const trpc = useTRPC();
   const queryClient = useQueryClient();
   const handleDelete = useCallback(async () => {
      await betterAuthClient.apiKey.delete(
         {
            keyId,
         },
         {
            onError: (error) => {
               console.error("Failed to delete API key:", error);
               toast.error(translate("pages.api-key.messages.delete-error"));
            },
            onSuccess: async () => {
               toast.success(
                  translate("pages.api-key.messages.delete-success"),
               );
               await queryClient.invalidateQueries({
                  queryKey: trpc.authHelpers.getApiKeys.queryKey(),
               });
               onOpenChange(false);
            },
         },
      );
   }, [
      onOpenChange,
      keyId,
      queryClient,
      trpc.authHelpers.getApiKeys.queryKey,
      trpc.authHelpers.getApiKeys,
   ]);

   return (
      <Credenza onOpenChange={onOpenChange} open={open}>
         <CredenzaContent>
            <CredenzaHeader>
               <CredenzaTitle>
                  {translate("pages.api-key.modals.delete.title")}
               </CredenzaTitle>
               <CredenzaDescription>
                  {translate("pages.api-key.modals.delete.description")}
               </CredenzaDescription>
            </CredenzaHeader>
            <CredenzaBody className="grid grid-cols-1 pb-0 flex flex-col items-center gap-4">
               <span className="text-destructive">
                  <AlertTriangle size={48} />
               </span>
               <div className="text-center text-sm text-destructive font-semibold">
                  {translate("pages.api-key.modals.delete.warning")}
               </div>
            </CredenzaBody>
            <CredenzaFooter className="grid grid-cols-2 gap-2">
               <Button onClick={handleCancel} variant="secondary">
                  {translate("common.actions.cancel")}
               </Button>
               <Button onClick={handleDelete} variant="destructive">
                  {translate("common.actions.delete")}
               </Button>
            </CredenzaFooter>
         </CredenzaContent>
      </Credenza>
   );
}
