import type { RouterOutput } from "@packages/api/client";
import { translate } from "@packages/localization";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@packages/ui/components/card";
import { InfoItem } from "@packages/ui/components/info-item";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { useTRPC } from "@/integrations/clients";
import { AgentWriterCard } from "@/widgets/agent-display-card/ui/agent-writter-card";

interface CompetitorInfoCardProps {
   competitor: RouterOutput["competitor"]["list"]["items"][number];
}

export function CompetitorInfoCard({ competitor }: CompetitorInfoCardProps) {
   const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("en-US", {
         day: "numeric",
         month: "long",
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
      <Card>
         <CardHeader>
            <CardTitle>
               {translate("pages.competitor-details.info-card.title")}
            </CardTitle>
            <CardDescription>
               {translate("pages.competitor-details.info-card.description")}
            </CardDescription>
         </CardHeader>
         <CardContent className="space-y-2">
            <AgentWriterCard
               description={competitor.summary || ""}
               name={competitor.name || ""}
               photo={data?.data || ""}
            />
            <div className="grid grid-cols-2 gap-2">
               <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  label={translate(
                     "pages.competitor-details.info-card.added-on",
                  )}
                  value={formatDate(new Date(competitor.createdAt))}
               />

               <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  label={translate(
                     "pages.competitor-details.info-card.last-updated",
                  )}
                  value={formatDate(new Date(competitor.updatedAt))}
               />
            </div>
         </CardContent>
      </Card>
   );
}
