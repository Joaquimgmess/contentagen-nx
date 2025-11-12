import { translate } from "@packages/localization";
import { useCompetitorList } from "../lib/competitor-list-context";
import { CompetitorCard } from "./competitor-card";

export function CompetitorCardsList() {
   const { items } = useCompetitorList();

   if (items.length === 0) {
      return (
         <div className="text-center text-muted-foreground py-8">
            <p>
               {translate("pages.competitor-list.empty-state.no-competitors")}
            </p>
         </div>
      );
   }

   return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {items.map((competitor) => (
            <CompetitorCard competitor={competitor} key={competitor.id} />
         ))}
      </div>
   );
}
