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
import { useRouter } from "@tanstack/react-router";
import { Camera, Edit, FileEdit, Plus, Trash, Users } from "lucide-react";
import { useState } from "react";
import { DeleteAgentDialog } from "@/features/agent-actions/ui/delete-agent-dialog";
import { EditAgentAction } from "@/features/agent-actions/ui/edit-agent-action";
import { ManageAgentPhoto } from "../features/manage-agent-photo";
import { TransferAgentToOrganizationDialog } from "../features/transfer-agent-to-organization";

interface AgentDetailsQuickActionsProps {
   agent: RouterOutput["agent"]["get"];
   onEditInstructions?: () => void;
}
export function AgentDetailsQuickActions({
   agent,
   onEditInstructions,
}: AgentDetailsQuickActionsProps) {
   const router = useRouter();

   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [managePhotoOpen, setManagePhotoOpen] = useState(false);
   const [transferDialogOpen, setTransferDialogOpen] = useState(false);
   const { handleEdit } = EditAgentAction({ agentId: agent?.id ?? "" });

   const handleCreateContent = () => {
      router.navigate({
         params: { agentId: agent?.id ?? "" },
         to: "/agents/$agentId/content/request",
      });
   };

   const actions = [
      {
         disabled: false,
         icon: Edit,
         label: translate("pages.agent-details.quick-actions.edit-agent"),
         onClick: handleEdit,
      },
      {
         disabled: !onEditInstructions,
         icon: FileEdit,
         label: translate(
            "pages.agent-details.quick-actions.edit-instructions",
         ),
         onClick: onEditInstructions,
      },
      {
         disabled: false,
         icon: Trash,
         label: translate("pages.agent-details.quick-actions.delete-agent"),
         onClick: () => setDeleteDialogOpen(true),
      },
      {
         disabled: !!agent?.organizationId,
         icon: Users,
         label: "Transfer to Organization", // TODO: Add translation key
         onClick: () => setTransferDialogOpen(true),
      },
      {
         disabled: false,
         icon: Plus,
         label: translate("pages.agent-details.quick-actions.create-content"),
         onClick: handleCreateContent,
      },
      {
         disabled: false,
         icon: Camera,
         label: translate(
            "pages.agent-details.quick-actions.manage-agent-photo",
         ),
         onClick: () => setManagePhotoOpen(true),
      },
   ];

   return (
      <>
         <Card>
            <CardHeader>
               <CardTitle>
                  {translate("pages.agent-details.quick-actions.title")}
               </CardTitle>
               <CardDescription>
                  {translate("pages.agent-details.quick-actions.description")}
               </CardDescription>
            </CardHeader>
            <CardContent className="w-full flex items-center justify-center gap-4">
               {actions.map((action, index) => (
                  <Tooltip key={`agent-action-${index + 1}`}>
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

         <DeleteAgentDialog
            agentId={agent?.id ?? ""}
            agentName={agent?.personaConfig.metadata.name ?? ""}
            onOpenChange={setDeleteDialogOpen}
            open={deleteDialogOpen}
         />

         <ManageAgentPhoto
            agent={agent}
            onOpenChange={setManagePhotoOpen}
            open={managePhotoOpen}
         />

         <TransferAgentToOrganizationDialog
            agentId={agent?.id ?? ""}
            agentName={agent?.personaConfig.metadata.name ?? ""}
            onOpenChange={setTransferDialogOpen}
            open={transferDialogOpen}
         />
      </>
   );
}
