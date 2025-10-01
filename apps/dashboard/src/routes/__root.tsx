import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { PostHogWrapper } from "@packages/posthog/client";
import { Toaster } from "@packages/ui/components/sonner";
import { ThemeProvider } from "@/layout/theme-provider";
import { ErrorModalProvider } from "@/features/error-modal/lib/context";
import { ErrorModal } from "@/features/error-modal/ui/error-modal";
import { useTRPC } from "@/integrations/clients";
import { useMutation } from "@tanstack/react-query";
import appCss from "@packages/ui/globals.css?url";
import {
   HeadContent,
   Outlet,
   Scripts,
   createRootRouteWithContext,
   redirect,
} from "@tanstack/react-router";
import type { RouterContext } from "../router";
import brandConfig from "@packages/brand/index.json";
import "@packages/localization";
import i18n from "@packages/localization";
export const Route = createRootRouteWithContext<RouterContext>()({
   ssr: true,
   wrapInSuspense: true,
   head: () => ({
      links: [
         {
            href: appCss,
            rel: "stylesheet",
         },
         { rel: "icon", href: "/favicon.svg" },
      ],
      meta: [
         {
            title: `${brandConfig.name} - ${brandConfig.catch}`,
         },
         {
            charSet: "UTF-8",
         },
         {
            name: "viewport",
            content: "width=device-width, initial-scale=1.0",
         },
         {
            name: "language",
            content: i18n.language,
         },
      ],
      scripts: [
         ...(!import.meta.env.PROD
            ? [
                 {
                    type: "module",
                    children: `import RefreshRuntime from "/@react-refresh"
  RefreshRuntime.injectIntoGlobalHook(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
  window.__vite_plugin_react_preamble_installed__ = true`,
                 },
                 {
                    type: "module",
                    src: "/@vite/client",
                 },
              ]
            : []),
         {
            type: "module",
            src: import.meta.env.PROD
               ? "/assets/entry-client.js"
               : "/src/entry-client.tsx",
         },
      ],
   }),
   loader: async ({ location }) => {
      if (location.href === "/") {
         throw redirect({ to: "/auth/sign-in" });
      }
   },
   component: RootComponent,
});

function RootComponent() {
   return (
      <html lang={i18n.language}>
         <head>
            <HeadContent />
         </head>
         <body>
            <PostHogWrapper>
               <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
               >
                  <ErrorModalProvider>
                     <ErrorModalWithMutation />
                     <Toaster />
                     <Outlet /> {/* Start rendering router matches */}
                     <TanStackRouterDevtools position="bottom-left" />
                  </ErrorModalProvider>
               </ThemeProvider>
            </PostHogWrapper>
            <Scripts />
         </body>
      </html>
   );
}

function ErrorModalWithMutation() {
   const trpc = useTRPC();
   const submitBugReport = useMutation(
      trpc.bugReport.submitBugReport.mutationOptions(),
   );

   return <ErrorModal submitBugReport={submitBugReport} />;
}
