import { translate } from "@packages/localization";
import { Button } from "@packages/ui/components/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
   CheckSquare,
   ChevronLeft,
   ChevronRight,
   MoreVertical,
   PlusIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useAgentList } from "../lib/agent-list-context";

export function AgentListToolbar() {
   const { page, totalPages, handlePageChange, handleSelectAll, allSelected } =
      useAgentList();

   const actions = useMemo(
      () => [
         {
            icon: CheckSquare,
            label: allSelected
               ? translate("pages.agent-list.toolbar.unselect-all")
               : translate("pages.agent-list.toolbar.select-all"),
            onClick: handleSelectAll,
         },
         {
            href: "/agents/manual",
            icon: PlusIcon,
            label: translate("pages.agent-list.toolbar.create-new-agent"),
            onClick: () => {
               // This will be handled by the Link component
            },
         },
      ],
      [handleSelectAll, allSelected],
   );

   return (
      <div className="flex items-center justify-between gap-4 p-4 bg-background border rounded-lg shadow-sm">
         <div className="flex items-center gap-2">
            <Button
               disabled={page === 1}
               onClick={() => handlePageChange(page - 1)}
               size="icon"
               variant="outline"
            >
               <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm text-muted-foreground px-2">
               {page} {translate("pages.agent-list.toolbar.pagination.of")}{" "}
               {totalPages}
            </span>

            <Button
               disabled={page === totalPages}
               onClick={() => handlePageChange(page + 1)}
               size="icon"
               variant="outline"
            >
               <ChevronRight className="h-4 w-4" />
            </Button>
         </div>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button size="icon" variant="outline">
                  <MoreVertical className="h-4 w-4" />
               </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
               {actions.map((action) => (
                  <DropdownMenuItem
                     asChild={!!action.href}
                     className="flex gap-2"
                     key={action.label}
                     onClick={action.onClick}
                  >
                     {action.href ? (
                        <Link to={action.href}>
                           <action.icon className="h-4 w-4" />
                           {action.label}
                        </Link>
                     ) : (
                        <>
                           <action.icon className="h-4 w-4" />
                           {action.label}
                        </>
                     )}
                  </DropdownMenuItem>
               ))}
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
   );
}
