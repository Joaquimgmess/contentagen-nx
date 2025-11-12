import { translate } from "@packages/localization";
import { Button } from "@packages/ui/components/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import {
   Archive,
   CheckSquare,
   ChevronLeft,
   ChevronRight,
   MoreVertical,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BulkActionsCredenza } from "../features/bulk-actions-credenza";
import { useIdeasList } from "../lib/ideas-list-context";

export function IdeasListToolbar() {
   const {
      page,
      totalPages,
      handlePageChange,
      handleSelectAll,
      allSelected,
      selectedItems,
      selectedItemsCount,
      clearSelection,
   } = useIdeasList();

   const [openBulk, setOpenBulk] = useState(false);

   const actions = useMemo(
      () => [
         {
            icon: CheckSquare,
            label: allSelected
               ? translate("pages.ideas-list.toolbar.unselect-all")
               : translate("pages.ideas-list.toolbar.select-all"),
            onClick: handleSelectAll,
         },
         {
            disabled: selectedItemsCount === 0,
            icon: Archive,
            label: translate("pages.ideas-list.toolbar.bulk-actions"),
            onClick: () => setOpenBulk(true),
         },
      ],
      [handleSelectAll, allSelected, selectedItemsCount],
   );

   return (
      <>
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
                  {page} {translate("pages.ideas-list.toolbar.pagination.of")}{" "}
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
                        className="flex gap-2"
                        disabled={action.disabled}
                        key={action.label}
                        onClick={action.onClick}
                     >
                        <action.icon className="h-4 w-4" />
                        {action.label}
                     </DropdownMenuItem>
                  ))}
               </DropdownMenuContent>
            </DropdownMenu>
         </div>
         <BulkActionsCredenza
            onClearSelection={clearSelection}
            onOpenChange={setOpenBulk}
            open={openBulk}
            selectedItems={Array.from(selectedItems)}
         />
      </>
   );
}
