import i18n from "@packages/localization";
import posthog from "posthog-js";
import { toast } from "sonner";

type OpenErrorModalFn = (params: {
   title: string;
   description: string;
}) => void;

let globalOpenErrorModal: OpenErrorModalFn | null = null;

export function registerErrorModalOpener(openFn: OpenErrorModalFn) {
   globalOpenErrorModal = openFn;
}

export function createToast({
   type,
   title,
   message,
   duration,
}: {
   title?: string;
   type: "danger" | "success" | "warning" | "info" | "loading";
   message: string;
   duration?: number;
}) {
   if (type === "success") {
      toast.success(message, { duration });
      return;
   }

   if (type === "warning") {
      toast.warning(message, { duration, position: "top-center" });
      return;
   }

   if (type === "info") {
      toast.info(message, { duration });
      return;
   }

   if (type === "loading") {
      toast.loading(message, { duration });
      return;
   }

   posthog.capture("error-toast-opened", {
      description: message,
      title: title,
   });

   if (globalOpenErrorModal) {
      globalOpenErrorModal({
         description: message,
         title: title || i18n.t("common.errorModal.title"),
      });
   } else {
      toast.error(message, { duration, position: "top-center" });
   }
}
