import type { RouterOutput } from "@packages/api/client";
import { translate } from "@packages/localization";
import {
   Card,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from "@packages/ui/components/card";
import { InfoItem } from "@packages/ui/components/info-item";
import { Separator } from "@packages/ui/components/separator";
import { formatStringForDisplay } from "@packages/utils/text";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useMemo } from "react";
import { useTRPC } from "@/integrations/clients";
import { AgentWriterCard } from "@/widgets/agent-display-card/ui/agent-writter-card";

type Agent = RouterOutput["agent"]["get"];
export const AgentPersonaCard = ({ agent }: { agent: Agent }) => {
   const trpc = useTRPC();
   const { data } = useSuspenseQuery(
      trpc.agentFile.getProfilePhoto.queryOptions({
         agentId: agent?.id ?? "",
      }),
   );
   const items = useMemo(
      () => [
         {
            icon: FileText,
            label: translate("pages.agent-details.persona.content-type"),
            value: formatStringForDisplay(agent?.personaConfig?.purpose ?? ""),
         },
      ],
      [agent],
   );

   return (
      <Card>
         <CardHeader>
            <CardTitle className="line-clamp-1">
               {translate("pages.agent-details.persona.title")}
            </CardTitle>
            <CardDescription className="line-clamp-1">
               {translate("pages.agent-details.persona.description")}
            </CardDescription>
         </CardHeader>
         <CardContent className="grid grid-cols-1 gap-4">
            {items.map(({ label, value, icon: Icon }) => (
               <InfoItem
                  icon={<Icon className="w-4 h-4" />}
                  key={label}
                  label={label}
                  value={value}
               />
            ))}
         </CardContent>
         <CardFooter className="grid gap-2">
            <Separator />
            <AgentWriterCard
               description={agent?.personaConfig?.metadata.description ?? ""}
               name={agent?.personaConfig?.metadata.name ?? ""}
               photo={data?.data}
            />
         </CardFooter>
      </Card>
   );
};
