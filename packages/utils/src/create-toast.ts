import posthog from "posthog-js";
import { toast } from "sonner";

// Type for the error modal opener function
type OpenErrorModalFn = (params: {
   title: string;
   description: string;
}) => void;

// Global reference to the error modal opener
let globalOpenErrorModal: OpenErrorModalFn | null = null;

// Function to register the error modal opener (called by ErrorModalProvider)
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
   // ✅ SUCCESS: Toast verde simples
   if (type === "success") {
      toast.success(message);
      return;
   }

   // ⚠️ WARNING: Toast amarelo no topo
   if (type === "warning") {
      toast.warning(message, { position: "top-center" });
      return;
   }

   // ❌ DANGER: Captura no PostHog + Abre modal
   posthog.capture("error-toast-opened", {
      title: title,
      description: message,
   });

   // Open error modal if registered
   if (globalOpenErrorModal) {
      globalOpenErrorModal({
         title: title || "Ops! Ocorreu um erro",
         description: message,
      });
   } else {
      // Fallback to error toast if modal not available
      toast.error(message, { position: "top-center" });
   }
}
