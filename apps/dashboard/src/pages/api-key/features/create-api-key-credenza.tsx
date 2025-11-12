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
import { useAppForm } from "@packages/ui/components/form";
import { InfoItem } from "@packages/ui/components/info-item";
import { Input } from "@packages/ui/components/input";
import { useQueryClient } from "@tanstack/react-query";
import { Key } from "lucide-react";
import { type FormEvent, useCallback, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { betterAuthClient, useTRPC } from "@/integrations/clients";

function ApiKeyAlertCredenza({
   apiKey,
   open,
   onOpenChange,
}: {
   apiKey: string;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}) {
   const handleCopyApiKey = useCallback(() => {
      if (apiKey) {
         navigator.clipboard.writeText(apiKey);
         toast.success(translate("pages.api-key.messages.copy-success"));
      }
      onOpenChange(false);
   }, [apiKey, onOpenChange]);
   return (
      <Credenza onOpenChange={onOpenChange} open={open}>
         <CredenzaContent>
            <CredenzaHeader>
               <CredenzaTitle>
                  {translate("pages.api-key.modals.api-key-alert.title")}
               </CredenzaTitle>
               <CredenzaDescription>
                  {translate("pages.api-key.modals.api-key-alert.description")}
                  <br />
                  <strong>
                     {translate("pages.api-key.modals.api-key-alert.warning")}
                  </strong>
               </CredenzaDescription>
            </CredenzaHeader>
            <CredenzaBody className="grid grid-cols-1 pb-0">
               <InfoItem
                  icon={<Key />}
                  key={"api-key"}
                  label={translate(
                     "pages.api-key.modals.api-key-alert.key-label",
                  )}
                  value={apiKey}
               />
            </CredenzaBody>
            <CredenzaFooter>
               <Button onClick={handleCopyApiKey}>
                  {translate("pages.api-key.modals.api-key-alert.copy-button")}
               </Button>
            </CredenzaFooter>
         </CredenzaContent>
      </Credenza>
   );
}

export function CreateApiKeyCredenza({
   open,
   onOpenChange,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}) {
   const [newApiKey, setNewApiKey] = useState<string>("");
   const [alertOpen, setAlertOpen] = useState(false);
   const trpc = useTRPC();
   const schema = z.object({
      name: z
         .string(translate("common.form.field-required"))
         .min(1, translate("common.form.field-required")),
   });
   const queryClient = useQueryClient();
   const createApiKey = useCallback(
      async (values: z.infer<typeof schema>) => {
         await betterAuthClient.apiKey.create(
            {
               name: values.name,
            },
            {
               onError: (e) => {
                  console.error("Error creating API key:", e);
                  toast.error(translate("pages.api-key.messages.create-error"));
               },
               onSuccess: ({ data }) => {
                  toast.success(
                     translate("pages.api-key.messages.create-success"),
                  );
                  if (data?.key) setNewApiKey(data.key);
                  setAlertOpen(true);
                  queryClient.invalidateQueries({
                     queryKey: trpc.authHelpers.getApiKeys.queryKey(),
                  });
               },
            },
         );
      },
      [
         queryClient,
         trpc.authHelpers.getApiKeys.queryKey,
         trpc.authHelpers.getApiKeys,
      ],
   );

   const form = useAppForm({
      defaultValues: { name: "" },
      onSubmit: async ({ value, formApi }) => {
         await createApiKey(value);
         formApi.reset();
         onOpenChange(false);
      },
      validators: {
         onBlur: schema,
      },
   });
   const handleSubmit = useCallback(
      (e: FormEvent) => {
         e.preventDefault();
         e.stopPropagation();
         form.handleSubmit();
      },
      [form],
   );

   return (
      <>
         <Credenza onOpenChange={onOpenChange} open={open}>
            <CredenzaContent>
               <CredenzaHeader>
                  <CredenzaTitle>
                     {translate("pages.api-key.modals.create.title")}
                  </CredenzaTitle>
               </CredenzaHeader>
               <form onSubmit={(e) => handleSubmit(e)}>
                  <CredenzaBody>
                     <form.AppField name="name">
                        {(field) => (
                           <field.FieldContainer>
                              <field.FieldLabel>
                                 {translate(
                                    "pages.api-key.modals.create.name-label",
                                 )}
                              </field.FieldLabel>
                              <Input
                                 id={field.name}
                                 name={field.name}
                                 onBlur={field.handleBlur}
                                 onChange={(e) =>
                                    field.handleChange(e.target.value)
                                 }
                                 placeholder={translate(
                                    "pages.api-key.modals.create.name-placeholder",
                                 )}
                                 value={field.state.value}
                              />
                              <field.FieldMessage />
                           </field.FieldContainer>
                        )}
                     </form.AppField>
                  </CredenzaBody>
                  <CredenzaFooter>
                     <form.Subscribe>
                        {(formState) => (
                           <Button
                              className=" w-full shadow-lg transition-all duration-300 group bg-primary shadow-primary/20 hover:bg-primary/90 flex gap-2 items-center justify-center"
                              disabled={
                                 !formState.canSubmit || formState.isSubmitting
                              }
                              type="submit"
                              variant="default"
                           >
                              {translate("pages.api-key.modals.create.create")}
                           </Button>
                        )}
                     </form.Subscribe>
                  </CredenzaFooter>
               </form>
            </CredenzaContent>
         </Credenza>
         <ApiKeyAlertCredenza
            apiKey={newApiKey}
            onOpenChange={(isOpen) => {
               setAlertOpen(isOpen);
               if (!isOpen) setNewApiKey("");
            }}
            open={alertOpen}
         />
      </>
   );
}
