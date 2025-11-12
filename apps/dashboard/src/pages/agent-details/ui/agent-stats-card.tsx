import { translate } from "@packages/localization";
import { StatsCard } from "@packages/ui/components/stats-card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTRPC } from "@/integrations/clients";

export function AgentStatsCard() {
   const trpc = useTRPC();
   const id = useParams({
      from: "/_dashboard/agents/$agentId/",
      select: ({ agentId }) => agentId,
   });
   const { data } = useSuspenseQuery(
      trpc.agent.stats.queryOptions({
         id,
      }),
   );

   const items = useMemo(() => {
      const drafts = {
         description: translate("pages.agent-details.stats.drafts-description"),
         title: translate("pages.agent-details.stats.drafts"),
         value: data.totalDraft.toString(),
      };

      const published = {
         description: translate(
            "pages.agent-details.stats.published-description",
         ),
         title: translate("pages.agent-details.stats.published"),
         value: data.totalPublished.toString(),
      };

      const totalContentValue = (
         Number(data.totalDraft ?? 0) + Number(data.totalPublished ?? 0)
      ).toString();

      return [
         {
            description: translate(
               "pages.agent-details.stats.total-content-description",
            ),
            details: [drafts, published],
            label: translate("pages.agent-details.stats.total-content"),
            value: totalContentValue,
         },
         {
            description: translate(
               "pages.agent-details.stats.total-words-description",
            ),
            label: translate("pages.agent-details.stats.total-words"),
            value: data.wordsWritten?.toLocaleString() ?? "0",
         },
         {
            description: translate(
               "pages.agent-details.stats.avg-quality-score-description",
            ),
            label: translate("pages.agent-details.stats.avg-quality-score"),
            value: data.avgQualityScore?.toFixed(2).toString() ?? "0",
         },
         {
            description: translate(
               "pages.agent-details.stats.total-ideas-description",
            ),
            label: translate("pages.agent-details.stats.total-ideas"),
            value: data.totalIdeas?.toString() ?? "0",
         },
      ];
   }, [data]);

   return (
      <div className="w-full h-full gap-4 grid md:grid-cols-2">
         {items.map((item) => (
            <StatsCard
               description={item.description}
               details={item.details}
               key={item.label}
               title={item.label}
               value={item.value}
            />
         ))}
      </div>
   );
}
