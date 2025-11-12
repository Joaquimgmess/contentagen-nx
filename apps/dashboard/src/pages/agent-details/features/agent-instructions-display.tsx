import type { PersonaConfig } from "@packages/database/schemas/agent";
import { type TranslationKey, translate } from "@packages/localization";
import { Card, CardContent, CardHeader } from "@packages/ui/components/card";
import { Markdown } from "@packages/ui/components/markdown";
import {
   Tabs,
   TabsContent,
   TabsList,
   TabsTrigger,
} from "@packages/ui/components/tabs";
import { useMemo } from "react";

interface AgentInstructionsDisplayProps {
   personaConfig: PersonaConfig;
}

interface InstructionCard {
   titleKey: TranslationKey;
   descriptionKey: TranslationKey;
   placeholderKey: TranslationKey;
   value: string | undefined;
}

export function AgentInstructionsDisplay({
   personaConfig,
}: AgentInstructionsDisplayProps) {
   const cards = useMemo(() => {
      const instructions = personaConfig.instructions;

      return [
         {
            descriptionKey:
               "pages.agent-details.instructions.tabs.audience.description",
            placeholderKey:
               "pages.agent-details.instructions.tabs.audience.placeholder",
            titleKey: "pages.agent-details.instructions.tabs.audience.title",
            value: instructions?.audienceProfile,
         },
         {
            descriptionKey:
               "pages.agent-details.instructions.tabs.writing.description",
            placeholderKey:
               "pages.agent-details.instructions.tabs.writing.placeholder",
            titleKey: "pages.agent-details.instructions.tabs.writing.title",
            value: instructions?.writingGuidelines,
         },
         {
            descriptionKey:
               "pages.agent-details.instructions.tabs.rag.description",
            placeholderKey:
               "pages.agent-details.instructions.tabs.rag.placeholder",
            titleKey: "pages.agent-details.instructions.tabs.rag.title",
            value: instructions?.ragIntegration,
         },
      ] as InstructionCard[];
   }, [personaConfig]);

   return (
      <Tabs defaultValue={cards[0]?.titleKey}>
         <Card>
            <CardHeader className="">
               <TabsList className="w-full">
                  {cards.map((card) => (
                     <TabsTrigger key={card.titleKey} value={card.titleKey}>
                        {translate(card.titleKey)}
                     </TabsTrigger>
                  ))}
               </TabsList>
            </CardHeader>
            <CardContent>
               {cards.map((card) => (
                  <TabsContent key={card.titleKey} value={card.titleKey}>
                     <div className="space-y-4">
                        <Markdown
                           content={
                              card.value || translate(card.placeholderKey)
                           }
                        />
                     </div>
                  </TabsContent>
               ))}
            </CardContent>
         </Card>
      </Tabs>
   );
}
