import type { IdeaSelect } from "@packages/database/schema";
import { translate } from "@packages/localization";
import { StatsCard } from "@packages/ui/components/stats-card";
import { useMemo } from "react";

interface IdeaStatsCardProps {
   idea: IdeaSelect;
}

export function IdeaStatsCard({ idea }: IdeaStatsCardProps) {
   const items = useMemo(() => {
      return [
         {
            description: translate(
               "pages.idea-details.stats.confidence-score-description",
            ),
            label: translate("pages.idea-details.stats.confidence-score"),
            value: `${idea.confidence.score}%`,
         },
         {
            description: translate(
               "pages.idea-details.stats.total-keywords-description",
            ),
            label: translate("pages.idea-details.stats.total-keywords"),
            value: idea.meta?.tags?.length?.toString() || "0",
         },
      ];
   }, [idea]);

   return (
      <div className="w-full gap-4 grid md:grid-cols-2">
         {items.map((item) => (
            <StatsCard
               description={item.description}
               key={item.label}
               title={item.label}
               value={item.value}
            />
         ))}
      </div>
   );
}
