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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/integrations/clients";

interface CompetitorLogoUploadDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   currentLogo?: string;
}

export function CompetitorLogoUploadDialog({
   open,
   onOpenChange,
   currentLogo,
}: CompetitorLogoUploadDialogProps) {
   const trpc = useTRPC();
   const { id } = useParams({ from: "/_dashboard/competitors/$id" });
   const queryClient = useQueryClient();
   const [selectedFile, setSelectedFile] = useState<File | null>(null);
   const [filePreview, setFilePreview] = useState<string | undefined>();

   // Determine what image to display: new preview, existing logo, or nothing
   const displayImage = filePreview || currentLogo;

   const uploadLogoMutation = useMutation(
      trpc.competitorFile.uploadLogo.mutationOptions({
         onError: (error) => {
            toast.error(`Failed to upload logo: ${error.message}`);
         },
         onSuccess: async () => {
            toast.success("Logo uploaded successfully!");
            await queryClient.invalidateQueries({
               queryKey: trpc.competitor.get.queryKey({ id }),
            });
            onOpenChange(false);
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
         toast.error("Please select an image file");
         return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
         toast.error("File size must be less than 5MB");
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

         await uploadLogoMutation.mutateAsync({
            competitorId: id,
            contentType: selectedFile.type,
            fileBuffer: base64,
            fileName: selectedFile.name,
         });
      } catch (error) {
         console.error("Upload failed:", error);
         toast.error("Failed to upload logo");
      }
   };

   return (
      <Credenza onOpenChange={onOpenChange} open={open}>
         <CredenzaContent>
            <CredenzaHeader>
               <CredenzaTitle>Upload Competitor Logo</CredenzaTitle>
               <CredenzaDescription>
                  Upload a logo for this competitor. Supported formats: JPG,
                  PNG, WebP (max 5MB)
               </CredenzaDescription>
            </CredenzaHeader>
            <CredenzaBody className="space-y-4">
               {/* Dropzone */}
               <Dropzone
                  accept={{
                     "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
                  }}
                  disabled={uploadLogoMutation.isPending} // 5MB
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024}
                  onDrop={handleFileSelect}
                  src={selectedFile ? [selectedFile] : undefined}
               >
                  <DropzoneEmptyState>
                     {currentLogo && (
                        <img
                           alt="Current logo"
                           className="object-contain"
                           src={currentLogo}
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
                  <Button variant="outline">Cancel</Button>
               </CredenzaClose>
               <Button
                  disabled={!selectedFile || uploadLogoMutation.isPending}
                  onClick={handleUpload}
               >
                  {uploadLogoMutation.isPending
                     ? "Uploading..."
                     : "Upload Logo"}
               </Button>
            </CredenzaFooter>
         </CredenzaContent>
      </Credenza>
   );
}
