import { translate } from "@packages/localization";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";
import { Suspense } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";
import { TalkingMascot } from "@/widgets/talking-mascot/ui/talking-mascot";
import {
   ContentListProvider,
   useContentList,
} from "../lib/content-list-context";
import { useMissingImagesNotification } from "../lib/use-missing-images-notification";
import { ContentCardsList } from "./content-cards-list";
import { ContentCardsSkeleton } from "./content-cards-skeleton";
import { ContentListToolbar } from "./content-list-toolbar";

//TODO: criar um component padrao para paginacao + toolbar, bulk actions de aprovar, deletar ou rejeitar
function ContentListPageContent() {
   const trpc = useTRPC();
   const queryClient = useQueryClient();
   const { hasGeneratingContent } = useContentList();

   // Initialize missing images notification hook
   useMissingImagesNotification();

   useSubscription(
      trpc.content.onStatusChanged.subscriptionOptions(
         {},
         {
            enabled: hasGeneratingContent,
            onData(statusData) {
               toast.success(
                  translate("pages.content-list.messages.status-updated", {
                     status: statusData.status,
                  }),
               );
               queryClient.invalidateQueries({
                  queryKey: trpc.content.listAllContent.queryKey(),
               });
            },
         },
      ),
   );

   return (
      <main className="h-full w-full flex flex-col gap-4">
         <TalkingMascot
            message={translate("pages.content-list.mascot-message")}
         />
         <ContentListToolbar />
         <Suspense fallback={<ContentCardsSkeleton />}>
            <ContentCardsList />
         </Suspense>
      </main>
   );
}

export function ContentListPage() {
   const trpc = useTRPC();
   const search = useSearch({ from: "/_dashboard/content/" });
   const { data: agents } = useSuspenseQuery(trpc.agent.list.queryOptions());
   const { data } = useSuspenseQuery(
      trpc.content.listAllContent.queryOptions({
         limit: 8,
         page: search.page,
         status: ["draft", "approved", "pending"],
      }),
   );

   return (
      <ContentListProvider agents={agents.items} data={data}>
         <ContentListPageContent />
      </ContentListProvider>
   );
}
