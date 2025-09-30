import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { useTranslation } from "react-i18next";
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
   const { t } = useTranslation();
   const { state, actions } = useErrorModalStore();
   const [showBugReport, setShowBugReport] = useState(false);
   const [bugDescription, setBugDescription] = useState("");
   const queryClient = useQueryClient();

   const handleSubmitBug = () => {
      if (!bugDescription.trim()) return;

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
                  message: t("common.errorModal.successMessage"),
               });
               setBugDescription("");
               setShowBugReport(false);
               actions.closeModal();
            },
            onError: (error) => {
               const errorMessage =
                  error instanceof Error
                     ? error.message
                     : t("common.errorModal.errorMessage");
               createToast({
                  type: "danger",
                  title: t("common.errorModal.errorTitle"),
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
                  <DialogDescription>{state?.description}</DialogDescription>
               )}
            </DialogHeader>

            {showBugReport ? (
               <div className="flex flex-col gap-4">
                  <Textarea
                     value={bugDescription}
                     onChange={(e) => setBugDescription(e.target.value)}
                     placeholder={t("common.errorModal.placeholder")}
                     rows={6}
                     className="resize-none"
                  />
                  <DialogFooter className="gap-2">
                     <Button
                        variant="outline"
                        onClick={() => setShowBugReport(false)}
                        disabled={submitBugReport.isPending}
                     >
                        {t("common.errorModal.backButton")}
                     </Button>
                     <Button
                        onClick={handleSubmitBug}
                        disabled={
                           !bugDescription.trim() || submitBugReport.isPending
                        }
                     >
                        {submitBugReport.isPending
                           ? t("common.errorModal.submittingButton")
                           : t("common.errorModal.submitButton")}
                     </Button>
                  </DialogFooter>
               </div>
            ) : (
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
   const { t } = useTranslation();
   return (
      <Button onClick={() => setShowBugReport(true)} variant="outline">
         <MegaphoneIcon className="w-4 h-4 mr-2" />
         {t("common.errorModal.reportButton")}
      </Button>
   );
}
