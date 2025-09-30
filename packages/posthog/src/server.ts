//TODO: Use this on the errors to track the errors
import { PostHog } from "posthog-node";
import { posthogPublicKey, posthogHost } from "./shared-posthog-config";

export function getElysiaPosthogConfig() {
   const internalPosthog = new PostHog(posthogPublicKey, {
      host: posthogHost,
   });
   return internalPosthog;
}

// Export config for use in other packages
export { posthogPublicKey as posthogApiKey, posthogHost };
