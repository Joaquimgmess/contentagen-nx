import { createFileRoute } from "@tanstack/react-router";
import { ContentRequestDetailsPage } from "@/pages/content-details/ui/content-request-details-page";
import { z } from "zod";

const contentDetailsSearchSchema = z.object({
   agentId: z.string().optional(),
   page: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute("/_dashboard/content/$id")({
   loader: async ({ context, params }) => {
      const { trpc, queryClient } = context;
      const { id } = params;
      await queryClient.ensureQueryData(
         trpc.content.get.queryOptions({
            id,
         }),
      );
   },
   validateSearch: (search) => contentDetailsSearchSchema.parse(search),
   component: ContentRequestDetailsPage,
});
