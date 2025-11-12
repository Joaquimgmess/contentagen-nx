import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ContentListPage } from "@/pages/content-list/ui/content-list-page";

const contentSearchSchema = z.object({
   agentId: z.string().optional(),
   page: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute("/_dashboard/content/")({
   component: ContentListPage,
   validateSearch: (search) => contentSearchSchema.parse(search),
});
