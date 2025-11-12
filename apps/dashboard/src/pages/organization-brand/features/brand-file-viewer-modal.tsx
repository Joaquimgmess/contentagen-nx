import {
   Credenza,
   CredenzaBody,
   CredenzaContent,
   CredenzaDescription,
   CredenzaHeader,
   CredenzaTitle,
} from "@packages/ui/components/credenza";
import { Markdown } from "@packages/ui/components/markdown";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTRPC } from "@/integrations/clients";

interface BrandFileViewerModalProps {
   brandId: string;
}

export function BrandFileViewerModal({ brandId }: BrandFileViewerModalProps) {
   const trpc = useTRPC();
   const [isOpen, setIsOpen] = useState(false);
   const [fileName, setFileName] = useState("");

   const { data, isLoading } = useQuery({
      ...trpc.brandFile.getFileContent.queryOptions({
         brandId,
         fileName,
      }),
      enabled: isOpen && fileName !== "",
   });

   const open = (fileName: string) => {
      setFileName(fileName);
      setIsOpen(true);
   };

   const close = () => {
      setIsOpen(false);
      setFileName("");
   };

   return {
      close,
      fileContent: data?.content,
      fileName,
      isLoading,
      isOpen,
      Modal: () => (
         <Credenza onOpenChange={close} open={isOpen}>
            <CredenzaContent className="">
               <CredenzaHeader>
                  <CredenzaTitle className="flex items-center gap-2">
                     <FileText className="w-5 h-5" />
                     {fileName}
                  </CredenzaTitle>
                  <CredenzaDescription>
                     View the content of the selected file.
                  </CredenzaDescription>
               </CredenzaHeader>
               <CredenzaBody className="h-96 overflow-y-auto flex flex-col">
                  {isLoading ? (
                     <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="ml-2 text-muted-foreground">
                           Loading content...
                        </span>
                     </div>
                  ) : (
                     <Markdown content={data?.content ?? ""} />
                  )}
               </CredenzaBody>
            </CredenzaContent>
         </Credenza>
      ),
      open,
   };
}
