import { toast } from "sonner";

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
      toast.warning(message, { position: "top-center", duration });
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

   toast.error(message, { position: "top-center", duration });
}
