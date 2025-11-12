import { useIsomorphicLayoutEffect } from "@packages/ui/hooks/use-isomorphic-layout-effect";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
   createFileRoute,
   Outlet,
   useLocation,
   useRouter,
} from "@tanstack/react-router";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";
export const Route = createFileRoute("/callback/_authed")({
   component: RouteComponent,
   errorComponent: () => <>error</>,
   loader: async ({ context }) => {
      await context.queryClient.prefetchQuery(
         context.trpc.authHelpers.getSession.queryOptions(),
      );
   },
   wrapInSuspense: true,
});

function RouteComponent() {
   const location = useLocation();
   const router = useRouter();
   const trpc = useTRPC();
   const { data: session, error } = useSuspenseQuery(
      trpc.authHelpers.getSession.queryOptions(),
   );

   useIsomorphicLayoutEffect(() => {
      if (error) {
         toast.error("Failed to fetch session data.");
         router.navigate({
            replace: true,
            search: location.search,
            to: "/auth/sign-in",
         });
         return;
      }
      if (!session) {
         toast.error("You must be logged in to access this page.");
         router.navigate({
            replace: true,
            search: location.search,
            to: "/auth/sign-in",
         });
      }
   }, [session, location]);

   return <Outlet />;
}
