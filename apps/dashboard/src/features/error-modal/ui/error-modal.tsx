import { Button } from "@packages/ui/components/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@packages/ui/components/dialog";
import { Textarea } from "@packages/ui/components/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { MegaphoneIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createToast } from "../lib/create-toast";
import { useErrorModalStore } from "../lib/error-modal-context";

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
               error:
                  mutation.state.error instanceof TRPCClientError
                     ? {
                          data: (() => {
                             const { stack: _, ...dataWithoutStack } =
                                (mutation.state.error.data as Record<
                                   string,
                                   unknown
                                >) || {};
                             return dataWithoutStack;
                          })(),
                          message: mutation.state.error.message,
                       }
                     : mutation.state.error instanceof Error
                       ? {
                            message: mutation.state.error.message,
                            name: mutation.state.error.name,
                         }
                       : JSON.stringify(mutation.state.error),
               input: mutation.state.variables,
               key: mutation.options.mutationKey?.join(".") ?? "",
            };
         });

      submitBugReport.mutate(
         {
            currentURL: window.location.href,
            error: {
               description: state?.description || "",
               title: state?.title || "",
            },
            mutationCache: errorMutations,
            userReport: bugDescription,
         },
         {
            onError: (error) => {
               const errorMessage =
                  error instanceof Error
                     ? error.message
                     : t("common.errorModal.errorMessage");
               createToast({
                  message: errorMessage,
                  title: t("common.errorModal.errorTitle"),
                  type: "danger",
               });
            },
            onSuccess: () => {
               createToast({
                  message: t("common.errorModal.successMessage"),
                  type: "success",
               });
               setBugDescription("");
               setShowBugReport(false);
               actions.closeModal();
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
      <Dialog onOpenChange={handleClose} open={state?.isOpen}>
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
                     className="resize-none"
                     onChange={(e) => setBugDescription(e.target.value)}
                     placeholder={t("common.errorModal.placeholder")}
                     rows={6}
                     value={bugDescription}
                  />
                  <DialogFooter className="gap-2">
                     <Button
                        disabled={submitBugReport.isPending}
                        onClick={() => setShowBugReport(false)}
                        variant="outline"
                     >
                        {t("common.errorModal.backButton")}
                     </Button>
                     <Button
                        disabled={
                           !bugDescription.trim() || submitBugReport.isPending
                        }
                        onClick={handleSubmitBug}
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
