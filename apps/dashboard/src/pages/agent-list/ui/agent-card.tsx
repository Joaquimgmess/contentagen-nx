import type { AgentSelect } from "@packages/database/schema";
import type { PersonaConfig } from "@packages/database/schemas/agent";
import { translate } from "@packages/localization";
import { Badge } from "@packages/ui/components/badge";
import {
   Card,
   CardAction,
   CardFooter,
   CardHeader,
} from "@packages/ui/components/card";
import { Checkbox } from "@packages/ui/components/checkbox";
import {
   Credenza,
   CredenzaBody,
   CredenzaContent,
   CredenzaDescription,
   CredenzaHeader,
   CredenzaTitle,
   CredenzaTrigger,
} from "@packages/ui/components/credenza";
import { SquaredIconButton } from "@packages/ui/components/squared-icon-button";
import { formatValueToTitleCase } from "@packages/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Edit, Eye, PlusIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteAgentDialog } from "@/features/agent-actions/ui/delete-agent-dialog";
import { EditAgentAction } from "@/features/agent-actions/ui/edit-agent-action";
import { useTRPC } from "@/integrations/clients";
import { AgentWriterCard } from "@/widgets/agent-display-card/ui/agent-writter-card";
import { useAgentList } from "../lib/agent-list-context";

type AgentCardProps = {
   agent: AgentSelect;
};

export function AgentCard({ agent }: AgentCardProps) {
   const trpc = useTRPC();
   const { selectedItems, handleSelectionChange } = useAgentList();
   const { data: profilePhoto } = useSuspenseQuery(
      trpc.agentFile.getProfilePhoto.queryOptions({
         agentId: agent.id,
      }),
   );

   const [isCredenzaOpen, setIsCredenzaOpen] = useState(false);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const navigate = useNavigate();

   const personaConfig = agent.personaConfig as PersonaConfig;

   const purpose = personaConfig.purpose
      ? formatValueToTitleCase(personaConfig.purpose.replace("_", " "))
      : translate("pages.agent-list.agent-card.not-specified");

   const { handleEdit } = EditAgentAction({ agentId: agent.id });

   const handleViewDetails = () => {
      navigate({
         params: { agentId: agent.id },
         to: "/agents/$agentId",
      });
      setIsCredenzaOpen(false);
   };

   const handleViewContent = () => {
      navigate({
         params: { agentId: agent.id },
         to: "/agents/$agentId/content/request",
      });
      setIsCredenzaOpen(false);
   };

   const handleEditAgent = () => {
      handleEdit();
      setIsCredenzaOpen(false);
   };

   const handleDelete = () => {
      setDeleteDialogOpen(true);
   };

   return (
      <>
         <Credenza onOpenChange={setIsCredenzaOpen} open={isCredenzaOpen}>
            <CredenzaTrigger asChild>
               <Card className="cursor-pointer">
                  <CardHeader>
                     <AgentWriterCard
                        description={personaConfig.metadata.description}
                        isHeader={true}
                        name={personaConfig.metadata.name}
                        photo={profilePhoto?.data}
                     />

                     <CardAction>
                        <Checkbox
                           checked={selectedItems.has(agent.id)}
                           onCheckedChange={(checked) =>
                              handleSelectionChange(
                                 agent.id,
                                 checked as boolean,
                              )
                           }
                           onClick={(e) => e.stopPropagation()}
                        />
                     </CardAction>
                  </CardHeader>

                  <CardFooter className="flex items-center justify-between">
                     <Badge variant="outline">{purpose}</Badge>
                  </CardFooter>
               </Card>
            </CredenzaTrigger>
            <CredenzaContent>
               <CredenzaHeader>
                  <CredenzaTitle>{personaConfig.metadata.name}</CredenzaTitle>
                  <CredenzaDescription>
                     {personaConfig.metadata.description}
                  </CredenzaDescription>
               </CredenzaHeader>
               <CredenzaBody className="grid grid-cols-2 gap-2">
                  <SquaredIconButton onClick={handleViewDetails}>
                     <Eye className="h-4 w-4" />
                     {translate(
                        "pages.agent-details.quick-actions.view-details",
                     )}
                  </SquaredIconButton>

                  <SquaredIconButton onClick={handleViewContent}>
                     <PlusIcon className="h-4 w-4" />
                     {translate(
                        "pages.agent-details.quick-actions.create-content",
                     )}
                  </SquaredIconButton>

                  <SquaredIconButton onClick={handleEditAgent}>
                     <Edit className="h-4 w-4" />
                     {translate("pages.agent-details.quick-actions.edit-agent")}
                  </SquaredIconButton>

                  <SquaredIconButton destructive onClick={handleDelete}>
                     <Trash2 className="h-4 w-4" />
                     {translate(
                        "pages.agent-details.quick-actions.delete-agent",
                     )}
                  </SquaredIconButton>
               </CredenzaBody>
            </CredenzaContent>
         </Credenza>
         <DeleteAgentDialog
            agentId={agent.id}
            agentName={personaConfig.metadata.name}
            onOpenChange={setDeleteDialogOpen}
            open={deleteDialogOpen}
         />
      </>
   );
}
