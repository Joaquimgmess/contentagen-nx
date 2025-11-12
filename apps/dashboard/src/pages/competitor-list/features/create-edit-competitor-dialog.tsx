import type { CompetitorSelect } from "@packages/database/schema";
import { translate } from "@packages/localization";
import { Button } from "@packages/ui/components/button";
import {
   Credenza,
   CredenzaContent,
   CredenzaDescription,
   CredenzaFooter,
   CredenzaHeader,
   CredenzaTitle,
} from "@packages/ui/components/credenza";
import { useAppForm } from "@packages/ui/components/form";
import { Input } from "@packages/ui/components/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { type FormEvent, useCallback } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "@/integrations/clients";

const createCompetitorSchema = z.object({
   websiteUrl: z.url(translate("pages.competitor-list.validation.invalid-url")),
});

export type CreateCompetitorFormData = typeof createCompetitorSchema;

interface CreateEditCompetitorDialogProps {
   competitor?: CompetitorSelect;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function CreateEditCompetitorDialog({
   competitor,
   open,
   onOpenChange,
}: CreateEditCompetitorDialogProps) {
   const trpc = useTRPC();
   const queryClient = useQueryClient();

   const form = useAppForm({
      defaultValues: {
         websiteUrl: competitor?.websiteUrl || "",
      },
      onSubmit: async ({ value, formApi }) => {
         if (competitor) {
            await updateCompetitorMutation.mutateAsync({
               data: value,
               id: competitor.id,
            });
         } else {
            await createCompetitorMutation.mutateAsync(value);
         }
         return formApi.reset();
      },
      validators: {
         onChange: createCompetitorSchema,
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
   const router = useRouter();
   const createCompetitorMutation = useMutation(
      trpc.competitor.create.mutationOptions({
         onError: (error) => {
            toast.error(
               translate("pages.competitor-list.messages.create-error", {
                  error: error.message,
               }),
            );
         },
         onSuccess: async (data) => {
            toast.success(
               translate("pages.competitor-list.messages.create-success"),
            );
            await queryClient.invalidateQueries({
               queryKey: trpc.competitor.list.queryKey(),
            });
            router.navigate({
               params: {
                  id: data.id,
               },
               to: "/competitors/$id",
            });
            onOpenChange(false);
            form.reset();
         },
      }),
   );

   const updateCompetitorMutation = useMutation(
      trpc.competitor.update.mutationOptions({
         onError: (error) => {
            toast.error(
               translate("pages.competitor-list.messages.update-error", {
                  error: error.message,
               }),
            );
         },
         onSuccess: async () => {
            toast.success(
               translate("pages.competitor-list.messages.update-success"),
            );
            await queryClient.invalidateQueries({
               queryKey: trpc.competitor.list.queryKey(),
            });
            await queryClient.invalidateQueries({
               queryKey: trpc.competitor.get.queryKey(),
            });
            onOpenChange(false);
            form.reset();
         },
      }),
   );

   const isLoading =
      createCompetitorMutation.isPending || updateCompetitorMutation.isPending;

   return (
      <Credenza onOpenChange={onOpenChange} open={open}>
         <CredenzaContent className="sm:max-w-[425px]">
            <CredenzaHeader>
               <CredenzaTitle>
                  {competitor
                     ? translate(
                          "pages.competitor-list.modals.create-edit.edit-title",
                       )
                     : translate(
                          "pages.competitor-list.modals.create-edit.create-title",
                       )}
               </CredenzaTitle>
               <CredenzaDescription>
                  {competitor
                     ? translate(
                          "pages.competitor-list.modals.create-edit.edit-description",
                       )
                     : translate(
                          "pages.competitor-list.modals.create-edit.create-description",
                       )}
               </CredenzaDescription>
            </CredenzaHeader>
            <form onSubmit={handleSubmit}>
               <div className="grid gap-4 py-4">
                  <form.AppField name="websiteUrl">
                     {(field) => (
                        <field.FieldContainer>
                           <field.FieldLabel>
                              {translate(
                                 "pages.competitor-list.modals.create-edit.website-url-label",
                              )}
                           </field.FieldLabel>
                           <Input
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                 field.handleChange(e.target.value)
                              }
                              placeholder={translate(
                                 "pages.competitor-list.modals.create-edit.website-url-placeholder",
                              )}
                              value={field.state.value}
                           />
                           <field.FieldMessage />
                        </field.FieldContainer>
                     )}
                  </form.AppField>
               </div>
               <CredenzaFooter>
                  <Button
                     disabled={isLoading}
                     onClick={() => onOpenChange(false)}
                     type="button"
                     variant="outline"
                  >
                     {translate(
                        "pages.competitor-list.modals.create-edit.cancel",
                     )}
                  </Button>
                  <Button disabled={isLoading} type="submit">
                     {isLoading
                        ? translate(
                             "pages.competitor-list.modals.create-edit.saving",
                          )
                        : competitor
                          ? translate(
                               "pages.competitor-list.modals.create-edit.update",
                            )
                          : translate(
                               "pages.competitor-list.modals.create-edit.create",
                            )}
                  </Button>
               </CredenzaFooter>
            </form>
         </CredenzaContent>
      </Credenza>
   );
}
