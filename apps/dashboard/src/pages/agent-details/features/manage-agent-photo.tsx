import type { RouterOutput } from "@packages/api/client";
import { translate } from "@packages/localization";
import { Button } from "@packages/ui/components/button";
import {
   Credenza,
   CredenzaBody,
   CredenzaClose,
   CredenzaContent,
   CredenzaDescription,
   CredenzaFooter,
   CredenzaHeader,
   CredenzaTitle,
} from "@packages/ui/components/credenza";
import {
   Dropzone,
   DropzoneContent,
   DropzoneEmptyState,
} from "@packages/ui/components/dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";

type Agent = RouterOutput["agent"]["get"];
interface ManageAgentPhotoProps {
   agent: Agent;
   open?: boolean;
   onOpenChange?: (open: boolean) => void;
}

export function ManageAgentPhoto({
   agent: _agent,
   open,
   onOpenChange,
}: ManageAgentPhotoProps) {
   const isControlled = open !== undefined && onOpenChange !== undefined;
   const [internalOpen, setInternalOpen] = useState(false);

   const isOpen = isControlled ? open : internalOpen;
   const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
   const [selectedFile, setSelectedFile] = useState<File | null>(null);
   const [filePreview, setFilePreview] = useState<string | undefined>();
   const { agentId } = useParams({ from: "/_dashboard/agents/$agentId/" });
   const queryClient = useQueryClient();
   const trpc = useTRPC();

   // Fetch the profile photo using the streaming route
   const { data: profilePhotoData } = useQuery(
      trpc.agentFile.getProfilePhoto.queryOptions({
         agentId,
      }),
   );

   // Determine what image to display: new preview, existing photo, or nothing
   const displayImage = filePreview || profilePhotoData?.data;

   const uploadPhotoMutation = useMutation(
      trpc.agentFile.uploadProfilePhoto.mutationOptions({
         onError: (error) => {
            console.error("Upload error:", error);
            toast.error(
               translate(
                  "pages.agent-details.modals.manage-photo.messages.upload-failed",
               ),
            );
         },
         onSuccess: async () => {
            toast.success(
               translate(
                  "pages.agent-details.modals.manage-photo.messages.success",
               ),
            );
            await queryClient.invalidateQueries({
               queryKey: trpc.agent.get.queryKey({ id: agentId }),
            });
            await queryClient.invalidateQueries({
               queryKey: trpc.agentFile.getProfilePhoto.queryKey({ agentId }),
            });
            setIsOpen(false);
            setSelectedFile(null);
            setFilePreview(undefined);
         },
      }),
   );

   const handleFileSelect = (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
         toast.error(
            translate(
               "pages.agent-details.modals.manage-photo.messages.select-image",
            ),
         );
         return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
         toast.error(
            translate(
               "pages.agent-details.modals.manage-photo.messages.file-size-limit",
            ),
         );
         return;
      }

      setSelectedFile(file);

      // Create file preview
      const reader = new FileReader();
      reader.onload = (e) => {
         if (typeof e.target?.result === "string") {
            setFilePreview(e.target.result);
         }
      };
      reader.readAsDataURL(file);
   };

   const handleUpload = async () => {
      if (!selectedFile) return;

      try {
         // Use FileReader for efficient base64 conversion
         const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
               const result = reader.result as string;
               // Remove the data URL prefix to get just the base64
               const base64Data = result.split(",")[1];
               if (!base64Data) {
                  reject(new Error("Failed to extract base64 data"));
                  return;
               }
               resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
         });

         await uploadPhotoMutation.mutateAsync({
            agentId,
            contentType: selectedFile.type,
            fileBuffer: base64,
            fileName: selectedFile.name,
         });
      } catch (error) {
         console.error("Upload failed:", error);
         toast.error(
            translate(
               "pages.agent-details.modals.manage-photo.messages.general-error",
            ),
         );
      }
   };

   return (
      <Credenza onOpenChange={setIsOpen} open={isOpen}>
         <CredenzaContent>
            <CredenzaHeader>
               <CredenzaTitle>
                  {translate("pages.agent-details.modals.manage-photo.title")}
               </CredenzaTitle>
               <CredenzaDescription>
                  {translate(
                     "pages.agent-details.modals.manage-photo.description",
                  )}
               </CredenzaDescription>
            </CredenzaHeader>
            <CredenzaBody className="space-y-4">
               {/* Dropzone */}
               <Dropzone
                  accept={{
                     "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
                  }}
                  disabled={uploadPhotoMutation.isPending} // 5MB
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024}
                  onDrop={handleFileSelect}
                  src={selectedFile ? [selectedFile] : undefined}
               >
                  <DropzoneEmptyState>
                     {profilePhotoData?.data && (
                        <img
                           alt="profile"
                           className="  object-contain"
                           src={profilePhotoData.data}
                        />
                     )}
                  </DropzoneEmptyState>
                  <DropzoneContent>
                     {displayImage && (
                        <img
                           alt="Preview"
                           className="h-full w-full object-contain rounded-md"
                           src={displayImage}
                        />
                     )}
                  </DropzoneContent>
               </Dropzone>
            </CredenzaBody>
            <CredenzaFooter className="grid grid-cols-2 gap-2">
               <CredenzaClose asChild>
                  <Button variant="outline">
                     {translate(
                        "pages.agent-details.modals.manage-photo.cancel",
                     )}
                  </Button>
               </CredenzaClose>
               <Button
                  disabled={!selectedFile || uploadPhotoMutation.isPending}
                  onClick={handleUpload}
               >
                  {uploadPhotoMutation.isPending
                     ? translate(
                          "pages.agent-details.modals.manage-photo.uploading",
                       )
                     : translate(
                          "pages.agent-details.modals.manage-photo.upload",
                       )}
               </Button>
            </CredenzaFooter>
         </CredenzaContent>
      </Credenza>
   );
}
