import type { RouterOutput } from "@packages/api/client";
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
import {
   Brain,
   Edit,
   ExternalLink,
   RefreshCw,
   Trash,
   Upload,
} from "lucide-react";
import { useState } from "react";
import { createToast } from "@/features/error-modal/lib/create-toast";
import { useTRPC } from "@/integrations/clients";
import { CreateEditCompetitorDialog } from "../../competitor-list/features/create-edit-competitor-dialog";
import { DeleteCompetitorConfirmationDialog } from "../../competitor-list/features/delete-competitor-confirmation-dialog";

interface CompetitorDetailsActionsProps {
   competitor: RouterOutput["competitor"]["list"]["items"][number];
   onLogoUpload?: () => void;
}

export function CompetitorDetailsActions({
   competitor,
   onLogoUpload,
}: CompetitorDetailsActionsProps) {
   const trpc = useTRPC();
   const queryClient = useQueryClient();
   const [showEditDialog, setShowEditDialog] = useState(false);
   const [showDeleteDialog, setShowDeleteDialog] = useState(false);

   const analyzeMutation = useMutation(
      trpc.competitor.analyze.mutationOptions({
         onError: (error) => {
            createToast({
               message: translate(
                  "pages.competitor-details.messages.analysis-error",
                  {
                     error: error.message ?? "Unknown error",
                  },
               ),
               type: "danger",
            });
         },
         onSuccess: () => {
            createToast({
               message: translate(
                  "pages.competitor-details.messages.analysis-started",
               ),
               type: "success",
            });
            queryClient.invalidateQueries({
               queryKey: trpc.competitor.get.queryKey({ id: competitor.id }),
            });
         },
      }),
   );

   const generateFindingsMutation = useMutation(
      trpc.competitor.generateInsights.mutationOptions({
         onError: (error) => {
            createToast({
               message: `Error generating findings: ${error.message ?? "Unknown error"}`,
               type: "danger",
            });
         },
         onSuccess: () => {
            createToast({
               message: "Findings generation started!",
               type: "success",
            });
            queryClient.invalidateQueries({
               queryKey: trpc.competitor.get.queryKey({ id: competitor.id }),
            });
         },
      }),
   );

   const handleAnalyze = () => {
      analyzeMutation.mutate({ id: competitor.id });
   };

   const handleGenerateFindings = () => {
      generateFindingsMutation.mutate({ competitorId: competitor.id });
   };

   const handleVisitWebsite = () => {
      window.open(competitor.websiteUrl, "_blank", "noopener,noreferrer");
   };

   const actions = [
      {
         disabled: false,
         icon: ExternalLink,
         label: translate(
            "pages.competitor-details.actions.buttons.visit-website",
         ),
         onClick: handleVisitWebsite,
      },
      {
         disabled: analyzeMutation.isPending,
         icon: RefreshCw,
         label: analyzeMutation.isPending
            ? translate("pages.competitor-details.actions.buttons.analyzing")
            : translate(
                 "pages.competitor-details.actions.buttons.refresh-analysis",
              ),
         onClick: handleAnalyze,
      },
      {
         disabled: generateFindingsMutation.isPending,
         icon: Brain,
         label: generateFindingsMutation.isPending
            ? "Generating..."
            : "Generate Findings",
         onClick: handleGenerateFindings,
      },
      {
         disabled: !onLogoUpload,
         icon: Upload,
         label: translate(
            "pages.competitor-details.actions.buttons.upload-logo",
         ),
         onClick: onLogoUpload,
      },
      {
         disabled: false,
         icon: Edit,
         label: translate(
            "pages.competitor-details.actions.buttons.edit-competitor",
         ),
         onClick: () => setShowEditDialog(true),
      },
      {
         disabled: false,
         icon: Trash,
         label: translate(
            "pages.competitor-details.actions.buttons.delete-competitor",
         ),
         onClick: () => setShowDeleteDialog(true),
      },
   ];

   return (
      <>
         <Card>
            <CardHeader>
               <CardTitle>
                  {translate("pages.competitor-details.actions.card.title")}
               </CardTitle>
               <CardDescription>
                  {translate(
                     "pages.competitor-details.actions.card.description",
                  )}
               </CardDescription>
            </CardHeader>
            <CardContent className="w-full flex items-center justify-center gap-2">
               {actions.map((action, index) => (
                  <Tooltip key={`competitor-action-${index + 1}`}>
                     <TooltipTrigger asChild>
                        <Button
                           disabled={action.disabled}
                           onClick={action.onClick}
                           size="icon"
                           variant="outline"
                        >
                           <action.icon />
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent>{action.label}</TooltipContent>
                  </Tooltip>
               ))}
            </CardContent>
         </Card>

         <CreateEditCompetitorDialog
            competitor={competitor}
            onOpenChange={setShowEditDialog}
            open={showEditDialog}
         />

         <DeleteCompetitorConfirmationDialog
            competitor={competitor}
            onOpenChange={setShowDeleteDialog}
            open={showDeleteDialog}
         />
      </>
   );
}
