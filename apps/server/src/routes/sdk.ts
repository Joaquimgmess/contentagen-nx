import { auth } from "@api/integrations/auth";
import { db, ragClient } from "@api/integrations/database";
import { minioClient } from "@api/integrations/minio";
import { mastra, setRuntimeContext } from "@packages/agents";
import { getAgentById } from "@packages/database/repositories/agent-repository";
import { findMemberByUserId } from "@packages/database/repositories/auth-repository";
import { getBrandByOrgId } from "@packages/database/repositories/brand-repository";
import {
   getContentById,
   getContentBySlug,
   listContents,
} from "@packages/database/repositories/content-repository";
import { serverEnv as env } from "@packages/environment/server";
import { streamFileForProxy } from "@packages/files/client";
import type { SupportedLng } from "@packages/localization";
import { searchRelatedSlugsByText } from "@packages/rag/repositories/related-slugs-repository";
import { AppError, propagateError } from "@packages/utils/errors";
import { Elysia, t } from "elysia";

const minioBucket = env.MINIO_BUCKET;

const ImageSchema = t.Object(
   {
      contentType: t.String(),
      data: t.String(),
   },
   { additionalProperties: true },
);
export const sdkRoutes = new Elysia({
   prefix: "/sdk",
   serve: {
      idleTimeout: 0,
   },
})
   .macro({
      sdkAuth: {
         async resolve({ request }) {
            const authHeader = request.headers.get("sdk-api-key");
            if (!authHeader) {
               throw new Error("Missing API Key.");
            }

            const apiKeyData = await auth.api.verifyApiKey({
               body: { key: authHeader },
               headers: request.headers,
            });

            if (!apiKeyData.valid) {
               throw new Error("Invalid API Key.");
            }

            const session = await auth.api.getSession({
               headers: new Headers({ "sdk-api-key": authHeader }),
            });

            return { session };
         },
      },
   })
   .get(
      "/author/:agentId",
      async ({ params, session }) => {
         const agent = await getAgentById(db, params.agentId);

         if (!agent) {
            throw new Error("Agent not found");
         }

         if (agent.userId !== session?.user?.id) {
            throw new Error("Unauthorized access to agent information.");
         }

         let profilePhoto = null;
         if (agent.profilePhotoUrl) {
            try {
               const { buffer, contentType } = await streamFileForProxy(
                  agent.profilePhotoUrl,
                  minioBucket,
                  minioClient,
               );
               profilePhoto = {
                  contentType,
                  data: buffer.toString("base64"),
               };
            } catch (err) {
               console.error("Error fetching profile photo:", err);
               profilePhoto = null;
            }
         }

         return {
            name: agent.personaConfig?.metadata?.name ?? "",
            profilePhoto,
         };
      },
      {
         params: t.Object({
            agentId: t.String(),
         }),
         response: t.Object({
            name: t.String(),
            profilePhoto: t.Nullable(ImageSchema),
         }),
         sdkAuth: true,
      },
   )
   .get(
      "/related-slugs",
      async ({ query }) => {
         if (!query.slug || !query.agentId) {
            throw new Error("Slug and Agent ID are required.");
         }

         const slugs = await searchRelatedSlugsByText(
            ragClient,
            query.slug,
            query.agentId,
            { limit: 3 },
         );

         return slugs.map((s) => s.slug).filter((s) => s !== query.slug);
      },
      {
         query: t.Object({
            agentId: t.String(),
            slug: t.String(),
         }),
         response: t.Array(t.String()),
         sdkAuth: true,
      },
   )

   .get(
      "/assistant",
      async ({ query, request, session }) => {
         const language = request.headers.get("x-locale");
         if (!language) {
            throw new Error("Language header is required.");
         }
         const userId = session?.session.userId;
         if (!userId) {
            throw new Error("Unauthorized");
         }
         const member = await findMemberByUserId(db, userId);
         if (!member) {
            throw new Error("Member not found.");
         }

         if (!member.organizationId) {
            throw new Error("Organization not found for user.");
         }
         const brand = await getBrandByOrgId(db, member?.organizationId);

         const runtimeContext = setRuntimeContext({
            brandId: brand?.id || "",
            language: language as SupportedLng,
            userId: userId,
         });

         try {
            const agentInstance = mastra.getAgent("appAssistantAgent");
            const result = await agentInstance.stream(
               [{ content: query.message, role: "user" }],
               { format: "aisdk", runtimeContext },
            );
            return result.toTextStreamResponse();
         } catch (error) {
            console.error("Error processing agent generation:", error);
            propagateError(error);
            throw AppError.internal("Internal Server Error");
         }
      },
      {
         query: t.Object({
            message: t.String(),
         }),
         sdkAuth: true,
      },
   )

   // listContentByAgent
   .get(
      "/content/:agentId",
      async ({ params, query }) => {
         const { agentId } = params;
         const limit = parseInt(query.limit || "10", 10);
         const page = parseInt(query.page || "1", 10);
         const status = query.status;
         const all = await listContents(db, [agentId], status ?? ["approved"]);
         const start = (page - 1) * limit;
         const end = start + limit;
         const posts = all.slice(start, end);

         const postsWithImages = await Promise.all(
            posts.map(async (post) => {
               let image = null;
               if (post.imageUrl) {
                  try {
                     const { buffer, contentType } = await streamFileForProxy(
                        post.imageUrl,
                        minioBucket,
                        minioClient,
                     );
                     image = {
                        contentType,
                        data: buffer.toString("base64"),
                     };
                  } catch (error) {
                     console.error(
                        "Error fetching image for post:",
                        post.id,
                        error,
                     );
                     image = null;
                  }
               }
               return {
                  ...post,
                  image,
               };
            }),
         );

         return { posts: postsWithImages, total: all.length };
      },
      {
         params: t.Object({
            agentId: t.String(),
         }),
         query: t.Object({
            limit: t.Optional(t.String()),
            page: t.Optional(t.String()),
            status: t.Optional(t.Array(t.UnionEnum(["draft", "approved"]))),
         }),
         sdkAuth: true,
      },
   )

   // getContentBySlug
   .get(
      "/content/:agentId/:slug",
      async ({ params }) => {
         try {
            const content = await getContentBySlug(
               db,
               params.slug,
               params.agentId,
            );
            if (!content) {
               throw new Error("Content not found");
            }

            let image = null;
            if (content.imageUrl) {
               try {
                  const { buffer, contentType } = await streamFileForProxy(
                     content.imageUrl,
                     minioBucket,
                     minioClient,
                  );
                  image = {
                     contentType,
                     data: buffer.toString("base64"),
                  };
               } catch (error) {
                  console.error(
                     "Error fetching image for content:",
                     content.id,
                     error,
                  );
                  image = null;
               }
            }

            return {
               ...content,
               image,
            };
         } catch (err) {
            throw new Error(
               err instanceof Error ? err.message : "An unknown error occurred",
            );
         }
      },
      {
         params: t.Object({
            agentId: t.String(),
            slug: t.String(),
         }),
         sdkAuth: true,
      },
   )

   // getContentImage
   .get(
      "/content/image/:contentId",
      async ({ params }) => {
         try {
            const content = await getContentById(db, params.contentId);

            if (!content?.imageUrl) {
               return null;
            }

            const { buffer, contentType } = await streamFileForProxy(
               content.imageUrl,
               minioBucket,
               minioClient,
            );

            return {
               contentType,
               data: buffer.toString("base64"),
            };
         } catch (error) {
            console.error("Error fetching content image:", error);
            return null;
         }
      },
      {
         params: t.Object({
            contentId: t.String(),
         }),
         response: t.Nullable(ImageSchema),
         sdkAuth: true,
      },
   );
