import type { IdeaSelect } from "@packages/database/schema";
import { translate } from "@packages/localization";
import { Button } from "@packages/ui/components/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@packages/ui/components/card";
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@packages/ui/components/tooltip";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { CheckCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";
import { ApproveConfirmationCredenza } from "../features/approve-confirmation-credenza";
import { IdeaDeleteConfirmationCredenza } from "../features/delete-confirmation-credenza";

export function IdeaDetailsQuickActions({ idea }: { idea: IdeaSelect }) {
   const router = useRouter();
   const trpc = useTRPC();
   const [approveDialogOpen, setApproveDialogOpen] = useState(false);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

   const approveMutation = useMutation(
      trpc.ideas.approve.mutationOptions({
         onError: (error) => {
            toast.error(
               `${translate("pages.idea-details.toasts.approve-error")}: ${error.message ?? translate("pages.idea-details.toasts.unknown-error")}`,
            );
         },
         onSuccess: async (data) => {
            toast.success(
               translate("pages.idea-details.toasts.approve-success"),
            );
            router.navigate({
               params: {
                  id: data.content.id,
               },
               search: { page: 1 },
               to: "/content/$id",
            });
         },
      }),
   );

   const deleteMutation = useMutation(
      trpc.ideas.delete.mutationOptions({
         onError: (error) => {
            toast.error(
               `${translate("pages.idea-details.toasts.delete-error")}: ${error.message ?? translate("pages.idea-details.toasts.unknown-error")}`,
            );
         },
         onSuccess: () => {
            toast.success(
               translate("pages.idea-details.toasts.delete-success"),
            );
            router.navigate({
               search: { agentId: idea.agentId },
               to: "/ideas",
            });
         },
      }),
   );

   const handleApproveConfirm = () => {
      approveMutation.mutate({ id: idea.id });
      setApproveDialogOpen(false);
   };

   const handleDeleteConfirm = () => {
      deleteMutation.mutate({ id: idea.id });
      setDeleteDialogOpen(false);
   };

   const actions = [
      {
         disabled: idea.status === "approved" || idea.status === "rejected",
         icon: CheckCircle,
         label: translate("pages.idea-details.quick-actions.approve-idea"),
         onClick: () => setApproveDialogOpen(true),
      },
      {
         disabled: false,
         icon: Trash2,
         label: translate("pages.idea-details.quick-actions.delete-idea"),
         onClick: () => setDeleteDialogOpen(true),
      },
   ];

   return (
      <>
         <Card>
            <CardHeader>
               <CardTitle>
                  {translate("pages.idea-details.quick-actions.title")}
               </CardTitle>
               <CardDescription>
                  {translate("pages.idea-details.quick-actions.description")}
               </CardDescription>
            </CardHeader>
            <CardContent className="w-full flex items-center justify-center gap-2 flex-wrap">
               {actions.map((action, index) => (
                  <Tooltip key={`idea-action-${index + 1}`}>
                     <TooltipTrigger asChild>
                        <Button
                           className="flex items-center gap-2"
                           disabled={action.disabled}
                           onClick={action.onClick}
                           size="icon"
                           variant="outline"
                        >
                           <action.icon className="w-4 h-4" />
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent>{action.label}</TooltipContent>
                  </Tooltip>
               ))}
            </CardContent>
         </Card>

         <ApproveConfirmationCredenza
            onConfirm={handleApproveConfirm}
            onOpenChange={setApproveDialogOpen}
            open={approveDialogOpen}
         />
         <IdeaDeleteConfirmationCredenza
            onConfirm={handleDeleteConfirm}
            onOpenChange={setDeleteDialogOpen}
            open={deleteDialogOpen}
         />
      </>
   );
}
