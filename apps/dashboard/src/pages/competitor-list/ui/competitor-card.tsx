import type { RouterOutput } from "@packages/api/client";
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
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Edit, Eye, Globe, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useTRPC } from "@/integrations/clients";
import { AgentWriterCard } from "@/widgets/agent-display-card/ui/agent-writter-card";
import { CreateEditCompetitorDialog } from "../features/create-edit-competitor-dialog";
import { DeleteCompetitorConfirmationDialog } from "../features/delete-competitor-confirmation-dialog";
import { useCompetitorList } from "../lib/competitor-list-context";

interface CompetitorCardProps {
   competitor: RouterOutput["competitor"]["list"]["items"][number];
}

export function CompetitorCard({ competitor }: CompetitorCardProps) {
   const { selectedItems, handleSelectionChange } = useCompetitorList();
   const [showDeleteDialog, setShowDeleteDialog] = useState(false);
   const [showEditDialog, setShowEditDialog] = useState(false);
   const [isCredenzaOpen, setIsCredenzaOpen] = useState(false);
   const router = useRouter();
   const handleNavigate = useCallback(() => {
      router.navigate({
         params: { id: competitor.id },
         to: "/competitors/$id",
      });
   }, [competitor.id, router]);
   const handleExternalNavigation = useCallback(() => {
      window.open(competitor.websiteUrl, "_blank");
   }, [competitor.websiteUrl]);
   const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("en-US", {
         day: "numeric",
         month: "short",
         year: "numeric",
      }).format(date);
   };
   const trpc = useTRPC();
   const { data } = useSuspenseQuery(
      trpc.competitorFile.getLogo.queryOptions({
         competitorId: competitor.id,
      }),
   );
   return (
      <>
         <Credenza onOpenChange={setIsCredenzaOpen} open={isCredenzaOpen}>
            <CredenzaTrigger asChild>
               <Card className="cursor-pointer">
                  <CardHeader>
                     <AgentWriterCard
                        description={competitor.summary ?? ""}
                        isHeader
                        name={competitor.name ?? ""}
                        photo={data?.data ?? ""}
                     />

                     <CardAction>
                        <Checkbox
                           checked={selectedItems.has(competitor.id)}
                           onCheckedChange={(checked) =>
                              handleSelectionChange(
                                 competitor.id,
                                 checked as boolean,
                              )
                           }
                           onClick={(e) => e.stopPropagation()}
                        />
                     </CardAction>
                  </CardHeader>
                  <CardFooter className="flex items-center justify-between">
                     <Badge variant="outline">
                        {formatDate(new Date(competitor.createdAt))}
                     </Badge>
                     {competitor.features && competitor.features.length > 0 && (
                        <Badge className="text-xs">
                           {translate(
                              "pages.competitor-list.card.features-count",
                              { count: competitor.features.length },
                           )}
                        </Badge>
                     )}
                  </CardFooter>
               </Card>
            </CredenzaTrigger>
            <CredenzaContent>
               <CredenzaHeader>
                  <CredenzaTitle>{competitor.name}</CredenzaTitle>
                  <CredenzaDescription>
                     {translate("pages.competitor-list.card.website-label", {
                        url: competitor.websiteUrl,
                     })}
                  </CredenzaDescription>
               </CredenzaHeader>
               <CredenzaBody className="grid grid-cols-2 gap-2">
                  <SquaredIconButton onClick={handleNavigate}>
                     <Eye className="h-4 w-4" />
                     {translate("pages.competitor-list.card.view-details")}
                  </SquaredIconButton>

                  <SquaredIconButton
                     onClick={() => {
                        setShowEditDialog(true);
                        setIsCredenzaOpen(false);
                     }}
                  >
                     <Edit className="h-4 w-4" />
                     {translate("pages.competitor-list.card.edit-competitor")}
                  </SquaredIconButton>
                  <SquaredIconButton onClick={handleExternalNavigation}>
                     <Globe className="h-4 w-4" />
                     {translate("pages.competitor-list.card.visit-website")}
                  </SquaredIconButton>
                  <SquaredIconButton
                     destructive
                     onClick={() => {
                        setShowDeleteDialog(true);
                        setIsCredenzaOpen(false);
                     }}
                  >
                     <Trash2 className="h-4 w-4" />
                     {translate("pages.competitor-list.card.delete-competitor")}
                  </SquaredIconButton>
               </CredenzaBody>
            </CredenzaContent>
         </Credenza>

         <DeleteCompetitorConfirmationDialog
            competitor={competitor}
            onOpenChange={setShowDeleteDialog}
            open={showDeleteDialog}
         />

         <CreateEditCompetitorDialog
            competitor={competitor}
            onOpenChange={setShowEditDialog}
            open={showEditDialog}
         />
      </>
   );
}
