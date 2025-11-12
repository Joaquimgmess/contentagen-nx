import { translate } from "@packages/localization";
import { Button } from "@packages/ui/components/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import {
   CheckSquare,
   ChevronLeft,
   ChevronRight,
   MoreVertical,
   PlusIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { CreateEditCompetitorDialog } from "../features/create-edit-competitor-dialog";
import { useCompetitorList } from "../lib/competitor-list-context";

export function CompetitorListToolbar() {
   const {
      page,
      totalPages,
      handlePageChange,
      handleSelectAll,
      selectedItemsCount,
      allSelectableSelected,
   } = useCompetitorList();

   const [showCreateDialog, setShowCreateDialog] = useState(false);

   const actions = useMemo(
      () => [
         {
            icon: CheckSquare,
            label: allSelectableSelected
               ? translate("pages.competitor-list.toolbar.unselect-all")
               : translate("pages.competitor-list.toolbar.select-all"),
            onClick: handleSelectAll,
         },
         {
            icon: PlusIcon,
            label: translate("pages.competitor-list.toolbar.new-competitor"),
            onClick: () => setShowCreateDialog(true),
         },
      ],
      [handleSelectAll, allSelectableSelected],
   );

   return (
      <>
         {/* Toolbar with Pagination */}
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
                  {page} {translate("pages.competitor-list.toolbar.of")}{" "}
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

            {selectedItemsCount > 0 && (
               <span className="text-sm text-muted-foreground">
                  {translate("pages.competitor-list.toolbar.selected-count", {
                     count: selectedItemsCount,
                  })}
               </span>
            )}

            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline">
                     <MoreVertical className="h-4 w-4" />
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="start">
                  {actions.map((action) => (
                     <DropdownMenuItem
                        className="flex gap-2"
                        key={action.label}
                        onClick={action.onClick}
                     >
                        {action.icon &&
                           React.createElement(action.icon, {
                              className: "h-4 w-4",
                           })}
                        {action.label}
                     </DropdownMenuItem>
                  ))}
               </DropdownMenuContent>
            </DropdownMenu>
         </div>

         <CreateEditCompetitorDialog
            onOpenChange={setShowCreateDialog}
            open={showCreateDialog}
         />
      </>
   );
}
