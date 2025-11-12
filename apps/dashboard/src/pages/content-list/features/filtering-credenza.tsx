import type { RouterInput, RouterOutput } from "@packages/api/client";
import { Button } from "@packages/ui/components/button";
import { Checkbox } from "@packages/ui/components/checkbox";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@packages/ui/components/dialog";
import { Label } from "@packages/ui/components/label";
import { Separator } from "@packages/ui/components/separator";

type Statuses = RouterInput["content"]["listAllContent"]["status"];
interface FilteringCredenzaProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   selectedStatuses: Statuses;
   selectedAgents: string[];
   onStatusesChange: (statuses: Statuses) => void;
   onAgentsChange: (agents: string[]) => void;
   agents?: RouterOutput["agent"]["list"]["items"];
}

const allStatuses = [
   { label: "Draft", value: "draft" },
   { label: "Approved", value: "approved" },
   { label: "Pending", value: "pending" },
   { label: "Planning", value: "planning" },
   { label: "Researching", value: "researching" },
   { label: "Writing", value: "writing" },
   { label: "Editing", value: "editing" },
   { label: "Analyzing", value: "analyzing" },
   { label: "Grammar Checking", value: "grammar_checking" },
];

export function FilteringCredenza({
   open,
   onOpenChange,
   selectedStatuses,
   selectedAgents,
   onStatusesChange,
   onAgentsChange,
   agents,
}: FilteringCredenzaProps) {
   const handleStatusChange = (status: Statuses[number], checked: boolean) => {
      if (checked) {
         onStatusesChange([...selectedStatuses, status]);
      } else {
         onStatusesChange(selectedStatuses.filter((s) => s !== status));
      }
   };

   const handleAgentChange = (agentId: string, checked: boolean) => {
      if (checked) {
         onAgentsChange([...selectedAgents, agentId]);
      } else {
         onAgentsChange(selectedAgents.filter((id) => id !== agentId));
      }
   };

   const clearFilters = () => {
      onStatusesChange([]);
      onAgentsChange([]);
   };

   return (
      <Dialog onOpenChange={onOpenChange} open={open}>
         <DialogContent className="max-w-md">
            <DialogHeader>
               <DialogTitle>Filter Content</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
               <div>
                  <h3 className="text-sm font-medium mb-3">Status</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                     {allStatuses.map((status) => (
                        <div
                           className="flex items-center space-x-2"
                           key={status.value}
                        >
                           <Checkbox
                              checked={selectedStatuses.includes(
                                 status.value as Statuses[number],
                              )}
                              id={`status-${status.value}`}
                              onCheckedChange={(checked) =>
                                 handleStatusChange(
                                    status.value as Statuses[number],
                                    checked as boolean,
                                 )
                              }
                           />
                           <Label
                              className="text-sm font-normal"
                              htmlFor={`status-${status.value}`}
                           >
                              {status.label}
                           </Label>
                        </div>
                     ))}
                  </div>
               </div>

               <Separator />

               <div>
                  <h3 className="text-sm font-medium mb-3">Agent</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                     {agents?.map((agent) => (
                        <div
                           className="flex items-center space-x-2"
                           key={agent.id}
                        >
                           <Checkbox
                              checked={selectedAgents.includes(agent.id)}
                              id={`agent-${agent.id}`}
                              onCheckedChange={(checked) =>
                                 handleAgentChange(agent.id, checked as boolean)
                              }
                           />
                           <Label
                              className="text-sm font-normal"
                              htmlFor={`agent-${agent.id}`}
                           >
                              {agent.personaConfig.metadata.name}
                           </Label>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="flex justify-end space-x-2 pt-4">
                  <Button onClick={clearFilters} variant="outline">
                     Clear All
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>
                     Apply Filters
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
   );
}
