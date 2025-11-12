import type { RouterOutput } from "@packages/api/client";
import { translate } from "@packages/localization";
import { Badge } from "@packages/ui/components/badge";
import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
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
import { formatStringForDisplay } from "@packages/utils/text";
import {
   useMutation,
   useQueryClient,
   useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";
import { Eye, Globe, Lock, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";
import { AgentWriterCard } from "@/widgets/agent-display-card/ui/agent-writter-card";
import { CardMultiStepLoader } from "@/widgets/multi-step-loader/ui/card-multi-step-loader";
import { ContentDeleteConfirmationCredenza } from "../features/content-delete-confirmation-credenza";
import { useContentList } from "../lib/content-list-context";

export function ContentRequestCard({
   request,
}: {
   request: RouterOutput["content"]["listAllContent"]["items"][0];
}) {
   const { selectedItems, handleSelectionChange } = useContentList();
   const trpc = useTRPC();
   const queryClient = useQueryClient();
   const navigate = useNavigate();
   const search = useSearch({ from: "/_dashboard/content/" });
   const { data: profilePhoto } = useSuspenseQuery(
      trpc.agentFile.getProfilePhoto.queryOptions({
         agentId: request.agent?.id,
      }),
   );

   const isLoading = useMemo(() => {
      return request.status === "pending";
   }, [request.status]);

   const [isCredenzaOpen, setIsCredenzaOpen] = useState(false);
   const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

   useSubscription(
      trpc.content.onStatusChanged.subscriptionOptions(
         {
            contentId: request.id,
         },
         {
            enabled: Boolean(isLoading),
            onData: ({ message, status }) => {
               toast.info(message || status);
            },
         },
      ),
   );
   const deleteMutation = useMutation(
      trpc.content.delete.mutationOptions({
         onError: (error) => {
            toast.error(translate("pages.content-list.messages.delete-error"));
            console.error("Delete error:", error);
         },
         onSuccess: async () => {
            toast.success(
               translate("pages.content-list.messages.delete-success"),
            );
            setIsCredenzaOpen(false);
            // Invalidate queries to refresh the list
            await queryClient.invalidateQueries({
               queryKey: trpc.content.listAllContent.queryKey(),
            });
         },
      }),
   );

   const handleView = useCallback(() => {
      navigate({
         params: { id: request.id },
         search,
         to: "/content/$id",
      });
      setIsCredenzaOpen(false);
   }, [navigate, request.id, search]);

   const handleDelete = useCallback(() => {
      setShowDeleteConfirmation(true);
   }, []);

   const confirmDelete = useCallback(async () => {
      await deleteMutation.mutateAsync({ id: request.id });
      setShowDeleteConfirmation(false);
   }, [deleteMutation, request.id]);

   return (
      <>
         <Credenza onOpenChange={setIsCredenzaOpen} open={isCredenzaOpen}>
            <CredenzaTrigger asChild>
               <Card className="cursor-pointer">
                  {isLoading ? (
                     <CardContent className="">
                        <CardMultiStepLoader
                           loading={isLoading}
                           loadingStates={[
                              {
                                 text: "Brewing creative ideas...",
                              },
                              {
                                 text: "Researching and analyzing...",
                              },
                              {
                                 text: "Crafting compelling content...",
                              },
                              {
                                 text: "Polishing and perfecting...",
                              },
                              {
                                 text: "Adding final touches...",
                              },
                           ]}
                        />
                     </CardContent>
                  ) : (
                     <>
                        <CardHeader>
                           <CardTitle className="line-clamp-1">
                              {request.meta?.title}
                           </CardTitle>
                           <CardDescription className="line-clamp-2">
                              {request.meta?.description ??
                                 translate(
                                    "pages.content-list.card.no-description",
                                 )}
                           </CardDescription>
                           <CardAction>
                              <Checkbox
                                 checked={selectedItems.has(request.id)}
                                 disabled={
                                    !["draft", "approved", "pending"].includes(
                                       request.status || "",
                                    )
                                 }
                                 onCheckedChange={(checked) =>
                                    handleSelectionChange(
                                       request.id,
                                       checked as boolean,
                                    )
                                 }
                                 onClick={(e) => e.stopPropagation()}
                              />
                           </CardAction>
                        </CardHeader>
                        <CardContent>
                           <AgentWriterCard
                              description={
                                 request.agent?.personaConfig.metadata
                                    .description ||
                                 translate(
                                    "pages.content-list.card.no-agent-description",
                                 )
                              }
                              name={
                                 request.agent?.personaConfig.metadata.name ||
                                 translate(
                                    "pages.content-list.card.unknown-agent",
                                 )
                              }
                              photo={profilePhoto?.data}
                           />
                        </CardContent>
                        <CardFooter className="flex items-center justify-between">
                           <Badge variant="outline">
                              {new Date(request.createdAt).toLocaleDateString()}
                           </Badge>
                           <div className="flex items-center gap-2">
                              <Badge className="text-xs">
                                 {formatStringForDisplay(request.status ?? "")}
                              </Badge>
                              {request.shareStatus === "shared" ? (
                                 <Globe className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                 <Lock className="w-4 h-4 text-muted-foreground" />
                              )}
                           </div>
                        </CardFooter>
                     </>
                  )}
               </Card>
            </CredenzaTrigger>
            <CredenzaContent>
               <CredenzaHeader>
                  <CredenzaTitle>
                     {request.meta?.title ||
                        translate("pages.content-list.card.untitled-content")}
                  </CredenzaTitle>
                  <CredenzaDescription>
                     {request.meta?.description ||
                        translate(
                           "pages.content-list.card.no-description-available",
                        )}
                  </CredenzaDescription>
               </CredenzaHeader>
               <CredenzaBody className="grid grid-cols-2 gap-2">
                  <SquaredIconButton onClick={handleView}>
                     <Eye className="h-4 w-4" />
                     {translate("pages.content-list.card.view-details")}
                  </SquaredIconButton>

                  <SquaredIconButton
                     destructive
                     disabled={deleteMutation.isPending}
                     onClick={handleDelete}
                  >
                     <Trash2 className="h-4 w-4" />
                     {deleteMutation.isPending
                        ? translate("common.actions.deleting")
                        : translate("pages.content-list.card.delete-content")}
                  </SquaredIconButton>
               </CredenzaBody>
            </CredenzaContent>
         </Credenza>
         <ContentDeleteConfirmationCredenza
            contentTitle={
               request.meta?.title ||
               translate("pages.content-list.card.this-content")
            }
            onConfirm={confirmDelete}
            onOpenChange={setShowDeleteConfirmation}
            open={showDeleteConfirmation}
         />
      </>
   );
}
