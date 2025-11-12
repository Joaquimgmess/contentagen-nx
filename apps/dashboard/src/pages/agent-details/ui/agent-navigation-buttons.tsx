import { translate } from "@packages/localization";
import { SquaredIconButton } from "@packages/ui/components/squared-icon-button";
import { Link } from "@tanstack/react-router";
import { FileText, Lightbulb } from "lucide-react";

interface AgentNavigationButtonsProps {
   agentId: string;
}

export function AgentNavigationButtons({
   agentId,
}: AgentNavigationButtonsProps) {
   return (
      <div className="grid grid-cols-2 gap-4">
         <Link search={{ agentId, page: 1 }} to="/content">
            <SquaredIconButton>
               <FileText className="w-6 h-6" />
               <span>
                  {translate("pages.agent-details.navigation.agent-content")}
               </span>
            </SquaredIconButton>
         </Link>
         <Link search={{ agentId }} to="/ideas">
            <SquaredIconButton>
               <Lightbulb className="w-6 h-6" />
               <span>
                  {translate("pages.agent-details.navigation.agent-ideas")}
               </span>
            </SquaredIconButton>
         </Link>
      </div>
   );
}
