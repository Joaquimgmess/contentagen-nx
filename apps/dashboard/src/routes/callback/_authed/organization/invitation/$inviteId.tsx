import { translate } from "@packages/localization";
import { Button } from "@packages/ui/components/button";
import {
   Card,
   CardContent,
   CardHeader,
   CardTitle,
} from "@packages/ui/components/card";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";
import { betterAuthClient, useTRPC } from "@/integrations/clients";

export const Route = createFileRoute(
   "/callback/_authed/organization/invitation/$inviteId",
)({
   component: RouteComponent,
});

function RouteComponent() {
   const router = useRouter();
   const inviteId = Route.useParams({
      select: (params) => params.inviteId,
   });

   const trpc = useTRPC();
   const queryClient = useQueryClient();
   const handleLogout = useCallback(async () => {
      await betterAuthClient.signOut(
         {},
         {
            onSuccess: async () => {
               await queryClient.invalidateQueries({
                  queryKey: trpc.authHelpers.getSession.queryKey(),
               });
               router.navigate({
                  to: "/auth/sign-in",
               });
            },
         },
      );
   }, [
      router,
      queryClient,
      trpc.authHelpers.getSession.queryKey,
      trpc.authHelpers.getSession,
   ]);
   const acceptInvitation = useCallback(async () => {
      await betterAuthClient.organization.acceptInvitation(
         {
            invitationId: inviteId,
         },
         {
            onError: (error) => {
               console.error("Failed to accept invitation:", error);
               toast.error(
                  translate("pages.organization-invitation.messages.error"),
               );
            },
            onSuccess: async () => {
               toast.success(
                  translate("pages.organization-invitation.messages.success"),
               );
               await handleLogout();
            },
         },
      );
   }, [inviteId, handleLogout]);
   //TODO: melhorar design
   return (
      <Card>
         <CardHeader>
            <CardTitle>
               {translate("pages.organization-invitation.title")}
            </CardTitle>
         </CardHeader>
         <CardContent>
            <Button
               className="mt-4"
               onClick={acceptInvitation}
               variant="default"
            >
               {translate("pages.organization-invitation.actions.accept")}
            </Button>
         </CardContent>
      </Card>
   );
}
