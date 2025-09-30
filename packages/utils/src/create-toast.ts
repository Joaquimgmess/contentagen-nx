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
}: {
   title?: string;
   type: "danger" | "success" | "warning";
   message: string;
}) {
   if (type === "success") {
      toast.success(message);
      return;
   }

   if (type === "warning") {
      toast.warning(message, { position: "top-center" });
      return;
   }

   posthog.capture("error-toast-opened", {
      title: title,
      description: message,
   });

   if (globalOpenErrorModal) {
      globalOpenErrorModal({
         title: title || "Ops! Ocorreu um erro",
         description: message,
      });
   } else {
      toast.error(message, { position: "top-center" });
   }
}
