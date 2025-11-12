import { translate } from "@packages/localization";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "@tanstack/react-router";
import { ContentRequestForm } from "@/features/content-request-form/ui/content-request-form";
import { createToast } from "@/features/error-modal/lib/create-toast";
import { useTRPC } from "@/integrations/clients";

export function AgentContentRequestPage() {
   const trpc = useTRPC();
   const state = useRouter();
   const { agentId } = useParams({
      from: "/_dashboard/agents/$agentId/content/request",
   });
   const queryClient = useQueryClient();
   // Create mutation for content request
   const contentRequestMutation = useMutation(
      trpc.content.create.mutationOptions({
         onError: (error) => {
            console.error("Failed to create content request:", error);
            createToast({
               message: translate(
                  "pages.content-request-form.messages.creation-failed",
               ),
               type: "danger",
            });
         },
         onSuccess: (data) => {
            createToast({
               message: translate(
                  "pages.content-request-form.messages.generation-started",
               ),
               type: "success",
            });
            queryClient.invalidateQueries({
               queryKey: trpc.content.listAllContent.queryKey({
                  status: ["draft", "approved"],
               }),
            });
            if (!data?.id) return state.history.back();
            state.navigate({
               params: { id: data.id },
               search: { page: 1 },
               to: "/content/$id",
            });
         },
      }),
   );

   return (
      <ContentRequestForm
         defaultValues={{
            description: "",
         }}
         onSubmit={async (values) => {
            await contentRequestMutation.mutateAsync({
               agentId,
               request: {
                  description: values.description,
                  layout: values.layout,
               },
            });
         }}
      />
   );
}
