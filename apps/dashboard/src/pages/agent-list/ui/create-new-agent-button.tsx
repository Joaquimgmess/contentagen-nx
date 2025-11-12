import { translate } from "@packages/localization";
import { SquaredIconButton } from "@packages/ui/components/squared-icon-button";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export const CreateNewAgentButton = () => (
   <Link to="/agents/manual">
      <SquaredIconButton
         aria-label={translate("pages.agent-list.create-button.aria-label")}
      >
         <Plus />
         {translate("pages.agent-list.create-button.text")}
      </SquaredIconButton>
   </Link>
);
