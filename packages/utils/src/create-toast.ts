import posthog from "posthog-js";
import { toast } from "sonner";
import { getErrorModalStore } from "./error-modal-context";

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

   getErrorModalStore.getState().actions.openModal({
      title: title || "Ops! Ocorreu um erro",
      description: message,
   });
}
