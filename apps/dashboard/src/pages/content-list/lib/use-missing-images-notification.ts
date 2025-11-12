import { translate } from "@packages/localization";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { createToast } from "@/features/error-modal/lib/create-toast";
import { useTRPC } from "@/integrations/clients";

export function useMissingImagesNotification() {
   const trpc = useTRPC();
   const lastNotificationTime = useRef<number>(0);
   const lastMissingCount = useRef<number>(0);

   // Get user workflow preferences
   const { data: workflowPrefs } = useSuspenseQuery(
      trpc.preferences.getWorkflow.queryOptions(),
   );

   const shouldNotify = useMemo(() => {
      return workflowPrefs?.notifyMissingImages ?? false;
   }, [workflowPrefs]);

   const { data: missingImagesData } = useQuery(
      trpc.preferences.checkMissingImages.queryOptions(undefined, {
         enabled: shouldNotify,
      }),
   );

   useEffect(() => {
      if (
         shouldNotify &&
         missingImagesData &&
         missingImagesData.total > 0 &&
         (missingImagesData.total !== lastMissingCount.current ||
            Date.now() - lastNotificationTime.current > 1000 * 60 * 60) // 1 hour
      ) {
         createToast({
            duration: 10000,
            message: translate("pages.content-list.messages.missing-images", {
               count: missingImagesData.total,
            }),
            type: "warning",
         });
         lastNotificationTime.current = Date.now();
         lastMissingCount.current = missingImagesData.total;
      }
   }, [missingImagesData, shouldNotify]);

   return {
      isEnabled: workflowPrefs?.notifyMissingImages ?? false,
      missingImages: missingImagesData?.missingImages ?? [],
      missingImagesCount: missingImagesData?.total ?? 0,
   };
}
