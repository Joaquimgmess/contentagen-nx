import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CompetitorListPage } from "@/pages/competitor-list/ui/competitor-list-page";

const competitorSearchSchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   search: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/competitors/")({
   component: CompetitorListPage,
   validateSearch: (search) => competitorSearchSchema.parse(search),
});
