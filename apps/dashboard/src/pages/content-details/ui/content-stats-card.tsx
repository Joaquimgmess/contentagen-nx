import type { ContentSelect } from "@packages/database/schema";
import { translate } from "@packages/localization";
import { StatsCard } from "@packages/ui/components/stats-card";
import { useMemo } from "react";

interface ContentStatsCardProps {
   content: ContentSelect;
}

export function ContentStatsCard({ content }: ContentStatsCardProps) {
   const items = useMemo(() => {
      const wordCount = Number(content.stats?.wordsCount || 0);
      const qualityScore = content.stats?.qualityScore || 0;

      return [
         {
            description: translate(
               "pages.content-details.stats.word-count-description",
            ),
            label: translate("pages.content-details.stats.word-count"),
            value: wordCount.toLocaleString(),
         },
         {
            description: translate(
               "pages.content-details.stats.content-quality-description",
            ),
            label: translate("pages.content-details.stats.content-quality"),
            value: `${qualityScore}/100`,
         },
      ];
   }, [content]);

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
