import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Mutation } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
   DialogFooter,
} from "@packages/ui/components/dialog";
import { Button } from "@packages/ui/components/button";
import { Textarea } from "@packages/ui/components/textarea";
import { MegaphoneIcon } from "lucide-react";
import { useErrorModalStore } from "@/lib/error-modal-context";
import { createToast } from "@packages/utils/create-toast";

type BugReportInput = {
   userReport: string;
   mutationCache: Array<{
      key: string;
      error: unknown;
      input: unknown;
   }>;
   currentURL: string;
   error: {
      title: string;
      description: string;
   };
};

type ErrorModalProps = {
   submitBugReport: {
      mutate: (
         input: BugReportInput,
         options?: {
            onSuccess?: () => void;
            onError?: (error: unknown) => void;
         },
      ) => void;
      isPending: boolean;
   };
};

export const ErrorModal = ({ submitBugReport }: ErrorModalProps) => {
   const { state, actions } = useErrorModalStore();
   const [showBugReport, setShowBugReport] = useState(false);
   const [bugDescription, setBugDescription] = useState("");
   const queryClient = useQueryClient();

   const handleSubmitBug = () => {
      if (!bugDescription.trim()) return;

      // 🔍 CAPTURA MUTATION CACHE DO REACT QUERY
      const errorMutations = queryClient
         .getMutationCache()
         .getAll()
         .filter((mutation) => mutation.state.status === "error")
         .map((mutation) => {
            return {
               key: mutation.options.mutationKey?.join(".") ?? "",
               error:
                  mutation.state.error instanceof TRPCClientError
                     ? {
                          message: mutation.state.error.message,
                          data: (() => {
                             // Remove stack trace (muito grande)
                             const { stack: _, ...dataWithoutStack } =
                                (mutation.state.error.data as Record<
                                   string,
                                   unknown
                                >) || {};
                             return dataWithoutStack;
                          })(),
                       }
                     : mutation.state.error instanceof Error
                       ? {
                            message: mutation.state.error.message,
                            name: mutation.state.error.name,
                         }
                       : JSON.stringify(mutation.state.error),
               input: mutation.state.variables,
            };
         });

      // 📤 ENVIA PARA BACKEND
      submitBugReport.mutate(
         {
            userReport: bugDescription,
            mutationCache: errorMutations,
            currentURL: window.location.href,
            error: {
               title: state?.title || "",
               description: state?.description || "",
            },
         },
         {
            onSuccess: () => {
               createToast({
                  type: "success",
                  message:
                     "Obrigado pelo feedback! Recebemos seu relato e vamos investigar o problema.",
               });
               setBugDescription("");
               setShowBugReport(false);
               actions.closeModal();
            },
            onError: (error) => {
               const errorMessage =
                  error instanceof Error ? error.message : "Erro desconhecido";
               createToast({
                  type: "danger",
                  title: "Erro ao enviar relatório",
                  message: errorMessage,
               });
            },
         },
      );
   };

   const handleClose = () => {
      setBugDescription("");
      setShowBugReport(false);
      actions.closeModal();
   };

   return (
      <Dialog open={state?.isOpen} onOpenChange={handleClose}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle className="text-red-600">
                  {state?.title}
               </DialogTitle>
               {!showBugReport && (
                  <DialogDescription>
                     <div
                        dangerouslySetInnerHTML={{
                           __html: state?.description ?? "",
                        }}
                     />
                  </DialogDescription>
               )}
            </DialogHeader>

            {showBugReport ? (
               // 📝 FORMULÁRIO DE RELATÓRIO
               <div className="flex flex-col gap-4">
                  <Textarea
                     value={bugDescription}
                     onChange={(e) => setBugDescription(e.target.value)}
                     placeholder="Por favor, descreva o que você estava tentando fazer quando o erro ocorreu..."
                     rows={6}
                     className="resize-none"
                  />
                  <DialogFooter className="gap-2">
                     <Button
                        variant="outline"
                        onClick={() => setShowBugReport(false)}
                        disabled={submitBugReport.isPending}
                     >
                        Voltar
                     </Button>
                     <Button
                        onClick={handleSubmitBug}
                        disabled={
                           !bugDescription.trim() || submitBugReport.isPending
                        }
                     >
                        {submitBugReport.isPending ? "Enviando..." : "Enviar"}
                     </Button>
                  </DialogFooter>
               </div>
            ) : (
               // ❌ TELA DE ERRO COM BOTÃO DE REPORTE
               <DialogFooter>
                  <BugReportButton setShowBugReport={setShowBugReport} />
               </DialogFooter>
            )}
         </DialogContent>
      </Dialog>
   );
};

function BugReportButton({
   setShowBugReport,
}: {
   setShowBugReport: (value: boolean) => void;
}) {
   const [errorMutationCache, setErrorMutationCache] = useState<Mutation[]>([]);
   const queryClient = useQueryClient();

   // ⏱️ DELAY DE 500ms para usuário ler o erro primeiro
   useEffect(() => {
      const timer = setTimeout(() => {
         setErrorMutationCache(
            queryClient
               .getMutationCache()
               .getAll()
               .filter((mutation) => mutation.state.status === "error"),
         );
      }, 500);

      return () => clearTimeout(timer);
   }, [queryClient]);

   // 🚫 Se não houver mutations com erro, não mostra botão
   if (!errorMutationCache.length) return null;

   return (
      <Button onClick={() => setShowBugReport(true)} variant="outline">
         <MegaphoneIcon className="w-4 h-4 mr-2" />
         Reportar este erro
      </Button>
   );
}
