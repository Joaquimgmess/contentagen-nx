import type { PersonaConfig } from "@packages/database/schemas/agent";
import { useAppForm } from "@packages/ui/components/form";
import { type FormEvent, useCallback } from "react";
import z from "zod";
import type { AgentCreationManualForm } from "../ui/agent-creation-manual-form";

export function useAgentForm({
   defaultValues,
   onSubmit,
}: AgentCreationManualForm) {
   const form = useAppForm({
      defaultValues: {
         instructions: {
            audienceProfile: "",
            ragIntegration: "",
            writingGuidelines: "",
         },
         metadata: { description: "", name: "" },
         purpose: "blog_post",
         ...defaultValues,
      } as PersonaConfig,
      onSubmit: async ({ value, formApi }) => {
         await onSubmit(value);
         formApi.reset();
      },
      validators: {
         //TODO: Onblur is not working when using the schema from the database
         onBlur: z.object({
            metadata: z.object({
               description: z.string().min(1, "This field is required"),
               name: z.string().min(1, "This field is required"),
            }),
            purpose: z.enum(["blog_post"]),
         }),
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

   return {
      form,
      handleSubmit,
   };
}
export type AgentForm = ReturnType<typeof useAgentForm>["form"];
