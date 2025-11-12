import type { BrandSelect } from "@packages/database/schema";
import { AGENT_FILE_UPLOAD_LIMIT } from "@packages/files/text-file-helper";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from "@packages/ui/components/card";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, MoreVertical } from "lucide-react";
import { useCallback, useMemo } from "react";
import { createToast } from "@/features/error-modal/lib/create-toast";
import { useTRPC } from "@/integrations/clients";
import { BrandFileViewerModal } from "../features/brand-file-viewer-modal";

export type UploadedFile = {
   fileName: string;
   fileUrl: string;
   uploadedAt: string;
};

function KnowledgeBaseEmptyState() {
   return (
      <div className="text-center py-8 text-muted-foreground">
         <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
         <p>No files uploaded yet</p>
         <p className="text-sm">
            Upload files to help us understand your brand better.
         </p>
      </div>
   );
}

export function BrandDetailsKnowledgeBaseCard({
   brand,
}: {
   brand: BrandSelect;
}) {
   const queryClient = useQueryClient();
   const trpc = useTRPC();
   const { open, Modal } = BrandFileViewerModal({ brandId: brand.id });

   const deleteFileMutation = useMutation(
      trpc.brandFile.delete.mutationOptions({
         onError: () => {
            createToast({
               message: "Failed to delete file",
               type: "danger",
            });
         },
         onSuccess: async () => {
            createToast({
               message: "File deleted successfully",
               type: "success",
            });
            await queryClient.invalidateQueries({
               queryKey: trpc.brand.getByOrganization.queryKey(),
            });
         },
      }),
   );

   const handleDeleteFile = useCallback(
      async (fileName: string) => {
         const fileToDelete = brand?.uploadedFiles?.find(
            (f: UploadedFile) => f.fileName === fileName,
         );
         if (fileToDelete) {
            await deleteFileMutation.mutateAsync({
               brandId: brand.id,
               fileName: fileName,
            });
         }
      },
      [brand, deleteFileMutation],
   );

   const handleViewFile = useCallback(
      (fileName: string) => {
         open(fileName);
      },
      [open],
   );

   const uploadedFiles = useMemo(
      () => brand.uploadedFiles || [],
      [brand.uploadedFiles],
   );
   const canAddMore = useMemo(
      () => uploadedFiles.length < AGENT_FILE_UPLOAD_LIMIT,
      [uploadedFiles],
   );
   const remainingSlots = useMemo(
      () => AGENT_FILE_UPLOAD_LIMIT - uploadedFiles.length,
      [uploadedFiles],
   );

   return (
      <>
         <Card className="h-full">
            <CardHeader>
               <CardTitle>Knowledge Base</CardTitle>
               <CardDescription>
                  Files that help us understand your brand better.
               </CardDescription>
               <CardAction>
                  {brand.status === "completed" && (
                     <Badge className="font-semibold">Indexed</Badge>
                  )}
               </CardAction>
            </CardHeader>
            <CardContent className="grid gap-2">
               {uploadedFiles.map((file, index) => (
                  <div
                     className="flex items-center justify-between p-4 border rounded-lg"
                     key={`file-${index + 1}`}
                  >
                     <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                           <p className="font-medium text-sm">
                              {file.fileName}
                           </p>
                           <p className="text-xs text-muted-foreground">
                              {`Uploaded on ${new Date(file.uploadedAt).toLocaleDateString()}`}
                           </p>
                        </div>
                     </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button size="icon" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem
                              onSelect={() => handleViewFile(file.fileName)}
                           >
                              View
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              onSelect={() => handleDeleteFile(file.fileName)}
                           >
                              Delete
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
               ))}
               {uploadedFiles.length === 0 && <KnowledgeBaseEmptyState />}
            </CardContent>
            <CardFooter className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
               <span>
                  {`${uploadedFiles.length} / ${AGENT_FILE_UPLOAD_LIMIT} files`}
               </span>
               <span>
                  {canAddMore
                     ? `${remainingSlots} slot${remainingSlots > 1 ? "s" : ""} remaining`
                     : "Upload limit reached"}
               </span>
            </CardFooter>
         </Card>
         <Modal />
      </>
   );
}
