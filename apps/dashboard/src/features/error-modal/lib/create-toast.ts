import posthog from "posthog-js";
import { createToast as baseCreateToast } from "@packages/utils/create-toast";
import i18n from "@packages/localization";

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
   if (type !== "danger") {
      baseCreateToast({ type, title, message, duration });
      return;
   }

   posthog.capture("error-toast-opened", {
      title: title,
      description: message,
   });

   if (globalOpenErrorModal) {
      globalOpenErrorModal({
         title: title || i18n.t("common.errorModal.title"),
         description: message,
      });
   } else {
      baseCreateToast({ type, title, message, duration });
   }
}
