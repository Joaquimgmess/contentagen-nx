import {
   getContentById,
   updateContent,
} from "@packages/database/repositories/content-repository";
import { streamFileForProxy, uploadFile } from "@packages/files/client";
import { compressImage } from "@packages/files/image-helper";
import { APIError, propagateError } from "@packages/utils/errors";
import { z } from "zod";
import { organizationProcedure, protectedProcedure, router } from "../trpc";

const ContentImageUploadInput = z.object({
   contentType: z.string(),
   fileBuffer: z.base64(), // base64 encoded
   fileName: z.string(),
   id: z.uuid(),
});

const ContentImageStreamInput = z.object({
   id: z.uuid(),
});

export const contentImagesRouter = router({
   addImageUrl: organizationProcedure
      .input(z.object({ id: z.uuid(), imageUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
         try {
            if (!input.id || !input.imageUrl) {
               throw APIError.validation(
                  "Content ID and image URL are required.",
               );
            }
            const db = (await ctx).db;
            const updated = await updateContent(db, input.id, {
               imageUrl: input.imageUrl,
            });
            return { content: updated, success: true };
         } catch (err) {
            propagateError(err);
            throw APIError.internal("Failed to add image URL");
         }
      }),
   getImage: protectedProcedure
      .input(ContentImageStreamInput)
      .query(async ({ ctx, input }) => {
         try {
            const db = (await ctx).db;
            const content = await getContentById(db, input.id);

            if (!content?.imageUrl) {
               return null;
            }

            const bucketName = (await ctx).minioBucket;
            const key = content.imageUrl;

            const { buffer, contentType } = await streamFileForProxy(
               key,
               bucketName,
               (await ctx).minioClient,
            );

            const base64 = buffer.toString("base64");
            return {
               contentType,
               data: `data:${contentType};base64,${base64}`,
            };
         } catch (error) {
            console.error("Error fetching content image:", error);
            return null;
         }
      }),
   uploadImage: organizationProcedure
      .input(ContentImageUploadInput)
      .mutation(async ({ ctx, input }) => {
         try {
            const { id, fileName, fileBuffer } = input;

            // Validate base64 format
            if (!fileBuffer || fileBuffer.length === 0) {
               throw APIError.validation("Invalid or empty file data");
            }

            // Get current content to check for existing image
            const db = (await ctx).db;
            const currentContent = await getContentById(db, id);

            // Delete old image if it exists
            if (currentContent?.imageUrl) {
               try {
                  const bucketName = (await ctx).minioBucket;
                  const minioClient = (await ctx).minioClient;
                  await minioClient.removeObject(
                     bucketName,
                     currentContent.imageUrl,
                  );
               } catch (error) {
                  console.error("Error deleting old content image:", error);
                  // Continue with upload even if deletion fails
               }
            }

            // Sanitize fileName to prevent directory traversal
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
            const key = `content/${id}/image/${sanitizedFileName}`;

            let buffer: Buffer;
            try {
               buffer = Buffer.from(fileBuffer, "base64");
            } catch (error) {
               console.error("Error decoding base64 file buffer:", error);
               throw APIError.validation("Invalid base64 data");
            }

            // Compress the image
            const compressedBuffer = await compressImage(buffer, {
               format: "webp",
               quality: 80,
            });

            const bucketName = (await ctx).minioBucket;
            const minioClient = (await ctx).minioClient;

            const url = await uploadFile(
               key,
               compressedBuffer,
               "image/webp",
               bucketName,
               minioClient,
            );

            // Update content imageUrl with the file key
            await updateContent(db, id, { imageUrl: key });

            return { success: true, url };
         } catch (err) {
            propagateError(err);
            console.error("Error uploading content image:", err);
            throw APIError.internal("Failed to upload image");
         }
      }),
});
