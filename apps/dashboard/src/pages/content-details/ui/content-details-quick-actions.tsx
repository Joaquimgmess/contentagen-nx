import type { ContentSelect } from "@packages/database/schema";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
   CheckCircle,
   Edit,
   Eye,
   Lock,
   RotateCcw,
   Share,
   Trash2,
   Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";
import { ContentDeleteConfirmationCredenza } from "../../content-list/features/content-delete-confirmation-credenza";
import { BlogPreviewCredenza } from "./blog-preview-credenza";
import { UploadContentImage } from "./upload-content-image";

export function ContentDetailsQuickActions({
   content,
   onEditBody,
}: {
   content: ContentSelect;
   onEditBody: () => void;
}) {
   const router = useRouter();
   const trpc = useTRPC();
   const queryClient = useQueryClient();
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [uploadImageOpen, setUploadImageOpen] = useState(false);
   const [blogPreviewOpen, setBlogPreviewOpen] = useState(false);

   const regenerateMutation = useMutation(
      trpc.content.regenerate.mutationOptions({
         onError: (error) => {
            toast.error(
               translate("pages.content-details.messages.regenerate-error", {
                  error: error.message ?? "Unknown error",
               }),
            );
         },
         onSuccess: async () => {
            toast.success(
               translate("pages.content-details.messages.regenerate-success"),
            );
            await queryClient.invalidateQueries({
               queryKey: trpc.content.get.queryKey({ id: content.id }),
            });
            await queryClient.invalidateQueries({
               queryKey: trpc.content.listAllContent.queryKey(),
            });
            await queryClient.invalidateQueries({
               queryKey: trpc.content.versions.getVersions.queryKey({
                  contentId: content.id,
               }),
            });
         },
      }),
   );

   const approveMutation = useMutation(
      trpc.content.approve.mutationOptions({
         onError: (error) => {
            toast.error(
               translate("pages.content-details.messages.approve-error", {
                  error: error.message ?? "Unknown error",
               }),
            );
         },
         onSuccess: async () => {
            toast.success(
               translate("pages.content-details.messages.approve-success"),
            );
            await queryClient.invalidateQueries({
               queryKey: trpc.content.get.queryKey({ id: content.id }),
            });
            await queryClient.invalidateQueries({
               queryKey: trpc.content.listAllContent.queryKey(),
            });
            await queryClient.invalidateQueries({
               queryKey: trpc.content.versions.getVersions.queryKey({
                  contentId: content.id,
               }),
            });
         },
      }),
   );

   const deleteMutation = useMutation(
      trpc.content.delete.mutationOptions({
         onError: (error) => {
            toast.error(
               translate("pages.content-details.messages.delete-error", {
                  error: error.message ?? "Unknown error",
               }),
            );
         },
         onSuccess: () => {
            toast.success(
               translate("pages.content-details.messages.delete-success"),
            );
            router.navigate({
               search: { agentId: content.agentId, page: 1 },
               to: "/content",
            });
         },
      }),
   );

   const toggleShareMutation = useMutation(
      trpc.content.toggleShare.mutationOptions({
         onError: (error) => {
            toast.error(
               translate("pages.content-details.messages.share-error", {
                  error: error.message ?? "Unknown error",
               }),
            );
         },
         onSuccess: async (data) => {
            const status =
               data.shareStatus === "shared"
                  ? translate("pages.content-details.status.shared")
                  : translate("pages.content-details.status.private");
            toast.success(
               translate("pages.content-details.messages.share-success", {
                  status,
               }),
            );
            await queryClient.invalidateQueries({
               queryKey: trpc.content.get.queryKey({ id: content.id }),
            });
            await queryClient.invalidateQueries({
               queryKey: trpc.content.listAllContent.queryKey(),
            });
         },
      }),
   );

   const handleRegenerate = () => {
      regenerateMutation.mutate({ id: content.id });
   };

   const handleApprove = () => {
      approveMutation.mutate({ id: content.id });
   };

   const handleDeleteConfirm = () => {
      deleteMutation.mutate({ id: content.id });
      setDeleteDialogOpen(false);
   };

   const handleToggleShare = () => {
      toggleShareMutation.mutate({ id: content.id });
   };

   interface ActionItem {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      onClick: () => void;
      disabled: boolean;
   }

   const actions: ActionItem[] = [
      {
         disabled: regenerateMutation.isPending,
         icon: RotateCcw,
         label: translate("pages.content-details.quick-actions.regenerate"),
         onClick: handleRegenerate,
      },
      {
         disabled: false,
         icon: Edit,
         label: translate("pages.content-details.quick-actions.edit"),
         onClick: onEditBody,
      },
      {
         disabled: false,
         icon: Upload,
         label: translate("pages.content-details.quick-actions.upload-image"),
         onClick: () => setUploadImageOpen(true),
      },
      {
         disabled: false,
         icon: Eye,
         label: translate("pages.content-details.quick-actions.preview"),
         onClick: () => setBlogPreviewOpen(true),
      },
      {
         disabled: approveMutation.isPending || content.status === "approved",
         icon: CheckCircle,
         label: translate("pages.content-details.quick-actions.approve"),
         onClick: handleApprove,
      },
      {
         disabled: toggleShareMutation.isPending,
         icon: content.shareStatus === "shared" ? Lock : Share,
         label:
            content.shareStatus === "shared"
               ? translate("pages.content-details.quick-actions.make-private")
               : translate("pages.content-details.quick-actions.share"),
         onClick: handleToggleShare,
      },
      {
         disabled: false,
         icon: Trash2,
         label: translate("pages.content-details.quick-actions.delete"),
         onClick: () => setDeleteDialogOpen(true),
      },
   ];

   return (
      <>
         <Card>
            <CardHeader>
               <CardTitle>
                  {translate("pages.content-details.quick-actions.title")}
               </CardTitle>
               <CardDescription>
                  {translate("pages.content-details.quick-actions.description")}
               </CardDescription>
            </CardHeader>
            <CardContent className="w-full flex items-center justify-center gap-2 flex-wrap">
               {actions.map((action, index) => (
                  <Tooltip key={`content-action-${index + 1}`}>
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

         <ContentDeleteConfirmationCredenza
            contentTitle={
               content.meta?.title ||
               translate("pages.content-details.messages.untitled-content")
            }
            onConfirm={handleDeleteConfirm}
            onOpenChange={setDeleteDialogOpen}
            open={deleteDialogOpen}
         />

         <UploadContentImage
            content={content}
            onOpenChange={setUploadImageOpen}
            open={uploadImageOpen}
         />
         <BlogPreviewCredenza
            content={content}
            onOpenChange={setBlogPreviewOpen}
            open={blogPreviewOpen}
         />
      </>
   );
}
