import { createFileRoute } from "@tanstack/react-router";
import { DashboardHomePage } from "@/pages/home/ui/home-page";

export const Route = createFileRoute("/_dashboard/home")({
   component: RouteComponent,
});

function RouteComponent() {
   return <DashboardHomePage />;
}
