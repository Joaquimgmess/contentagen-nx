import { translate } from "@packages/localization";
import { Badge } from "@packages/ui/components/badge";
import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@packages/ui/components/card";
import { Markdown } from "@packages/ui/components/markdown";
import { ScrollArea } from "@packages/ui/components/scroll-area";
import { SquaredIconButton } from "@packages/ui/components/squared-icon-button";
import { StatsCard } from "@packages/ui/components/stats-card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bot, FileText } from "lucide-react";
import { useMemo } from "react";
import { useTRPC } from "@/integrations/clients";

export function DashboardHomePage() {
   const trpc = useTRPC();
   const { data } = useSuspenseQuery(
      trpc.authHelpers.getHomeStats.queryOptions(),
   );
   const { data: findingsData } = useSuspenseQuery(
      trpc.competitor.getRandomFindings.queryOptions(),
   );

   // Extract insights and priorities from the nested structure
   const findings = useMemo(() => {
      const { insights, priorities } = findingsData;

      return {
         insights: insights || [],
         priorities: priorities || [],
      };
   }, [findingsData]);

   const statsCards = useMemo(
      () => [
         {
            description: translate(
               "pages.home.stats-cards.agent-stats.description",
            ),
            title: translate("pages.home.stats-cards.agent-stats.title"),
            value: data.totalAgents,
         },
         {
            description: translate(
               "pages.home.stats-cards.words-written.description",
            ),
            title: translate("pages.home.stats-cards.words-written.title"),
            value: data.wordCount30d?.toLocaleString() ?? "0",
         },
         {
            description: translate(
               "pages.home.stats-cards.content-generated.description",
            ),
            title: translate("pages.home.stats-cards.content-generated.title"),
            value: data.contentGenerated,
         },
      ],
      [data],
   );

   return (
      <div className="flex flex-col gap-4">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statsCards.map((card) => (
               <StatsCard
                  description={card.description}
                  key={card.title}
                  title={card.title}
                  value={card.value}
               />
            ))}
         </div>
         <div>
            <Card>
               <CardHeader>
                  <CardTitle>Competitor Insights</CardTitle>
                  <CardDescription>
                     Key insights and priorities from your competitor analysis.
                  </CardDescription>
               </CardHeader>
               <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                     <Card>
                        <CardHeader>
                           <CardTitle>Key Insights</CardTitle>
                           <CardDescription>
                              Important discoveries and patterns from competitor
                              analysis
                           </CardDescription>
                           <CardAction>
                              <Badge>{findings.insights.length}</Badge>
                           </CardAction>
                        </CardHeader>
                        <CardContent>
                           <ScrollArea className="h-54">
                              {findings.insights.length > 0 ? (
                                 <div className="space-y-3 pr-4">
                                    {findings.insights.map((insight, index) => (
                                       <Card key={`insight-${index + 1}`}>
                                          <CardContent>
                                             <Markdown content={insight} />
                                          </CardContent>
                                       </Card>
                                    ))}
                                 </div>
                              ) : (
                                 <p className="text-sm text-gray-500 italic">
                                    No insights available
                                 </p>
                              )}
                           </ScrollArea>
                        </CardContent>
                     </Card>

                     {/* Priorities Card */}
                     <Card>
                        <CardHeader>
                           <CardTitle>Recommended Priorities</CardTitle>
                           <CardDescription>
                              Action items and strategic recommendations based
                              on findings
                           </CardDescription>
                           <CardAction>
                              <Badge>{findings.priorities.length}</Badge>
                           </CardAction>
                        </CardHeader>
                        <CardContent>
                           <ScrollArea className="h-54">
                              {findings.priorities.length > 0 ? (
                                 <div className="space-y-3 pr-4">
                                    {findings.priorities.map(
                                       (priority, index) => (
                                          <Card key={`priority-${index + 1}`}>
                                             <CardContent>
                                                <Markdown content={priority} />
                                             </CardContent>
                                          </Card>
                                       ),
                                    )}
                                 </div>
                              ) : (
                                 <p className="text-sm text-gray-500 italic">
                                    No priorities available
                                 </p>
                              )}
                           </ScrollArea>
                        </CardContent>
                     </Card>
                  </div>

                  {findings.insights.length === 0 &&
                     findings.priorities.length === 0 && (
                        <div className="text-center py-8 mt-4">
                           <p className="text-sm text-muted-foreground">
                              No insights available. Please add competitors and
                              generate findings to get insights.
                           </p>
                        </div>
                     )}
               </CardContent>
            </Card>
         </div>
         <div className="grid grid-cols-2 gap-4">
            <Link to="/agents">
               <SquaredIconButton>
                  <Bot className="w-5 h-5 " />
                  {translate("pages.home.navigation.agents")}
               </SquaredIconButton>
            </Link>
            <Link search={{ page: 1 }} to="/content">
               <SquaredIconButton>
                  <FileText className="w-5 h-5" />
                  {translate("pages.home.navigation.content")}
               </SquaredIconButton>
            </Link>
         </div>
      </div>
   );
}
