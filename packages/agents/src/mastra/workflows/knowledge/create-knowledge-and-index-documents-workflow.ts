import { createStep, createWorkflow } from "@mastra/core/workflows";
import { MDocument } from "@mastra/rag";
import { createDb } from "@packages/database/client";
import { updateBrand } from "@packages/database/repositories/brand-repository";
import { updateCompetitor } from "@packages/database/repositories/competitor-repository";
import { serverEnv } from "@packages/environment/server";
import { getMinioClient, uploadFile } from "@packages/files/client";
import { createPgVector } from "@packages/rag/client";
import { createBrandKnowledgeWithEmbeddingsBulk } from "@packages/rag/repositories/brand-knowledge-repository";
import { createCompetitorKnowledgeWithEmbeddingsBulk } from "@packages/rag/repositories/competitor-knowledge-repository";
import { AppError, propagateError } from "@packages/utils/errors";
import { sanitizeDocumentType } from "@packages/utils/file";
import { z } from "zod";
import { documentGenerationAgent } from "../../agents/document-generation-agent";
import { documentSynthesizerAgent } from "../../agents/document-syntethizer-agent";
import { ingestUsage, type MastraLLMUsage } from "../../helpers";

const uploadDocumentsToStorage = async (
   generatedDocuments: Array<{ type: string; content: string; title: string }>,
   id: string,
   target: "brand" | "competitor",
) => {
   const minioClient = getMinioClient(serverEnv);

   return Promise.all(
      generatedDocuments.map(async (document, index) => {
         const sanitizedType = sanitizeDocumentType(
            document?.type || "document",
         );
         const fileName = `${target}-doc-${index + 1}-${sanitizedType}.md`;
         const key = `${id}/${fileName}`;

         await uploadFile(
            key,
            Buffer.from(document.content),
            "text/markdown",
            serverEnv.MINIO_BUCKET,
            minioClient,
         );

         return {
            fileName,
            fileUrl: key,
            uploadedAt: new Date().toISOString(),
         };
      }),
   );
};

// Input schema for the workflow
export const CreateKnowledgeAndIndexDocumentsInput = z.object({
   id: z.string(),
   target: z.enum(["brand", "competitor"]),
   userId: z.string(),
   websiteUrl: z.url(),
});

// Output schema for the workflow
export const CreateKnowledgeAndIndexDocumentsOutput = z.object({
   chunkCount: z.number(),
});

const createDocumentsOutputSchema =
   CreateKnowledgeAndIndexDocumentsInput.extend({
      generatedDocuments: z
         .array(
            z.object({
               content: z
                  .string()
                  .describe(
                     "Complete document content in perfect markdown format",
                  ),
               title: z.string().describe("Document title"),
               type: z.string().describe("Document type"),
            }),
         )
         .length(5)
         .describe(
            "Exactly 5 business documents generated from brand analysis",
         ),
   });
const getFullAnalysisOutputSchema =
   CreateKnowledgeAndIndexDocumentsInput.extend({
      fullAnalysis: z
         .string()
         .describe("Complete analysis document in perfect markdown format"),
   });
const getFullAnalysis = createStep({
   description: "Get full analysis from website",

   execute: async ({ inputData, runtimeContext }) => {
      const { userId, websiteUrl, id, target } = inputData;

      try {
         const inputPrompt = `
websiteUrl: ${websiteUrl}
userId: ${userId}
`;
         const result = await documentSynthesizerAgent.generate(
            [
               {
                  content: inputPrompt,
                  role: "user",
               },
            ],
            {
               output: getFullAnalysisOutputSchema.pick({
                  fullAnalysis: true,
               }),
               runtimeContext,
            },
         );

         await ingestUsage(result.usage as MastraLLMUsage, userId);
         if (!result?.object) {
            console.error(
               `[getFullAnalysis] Failed to generate analysis: documentSynthesizerAgent.generateVNext returned ${result ? "invalid result" : "null/undefined"}`,
            );
            propagateError(new Error("Failed to generate analysis"));
            throw AppError.internal("Failed to generate analysis from website");
         }

         const { fullAnalysis } = result.object;

         return {
            fullAnalysis,
            id,
            target,
            userId,
            websiteUrl,
         };
      } catch (err) {
         console.error(
            `[getFullAnalysis] Failed to get full analysis from website ${websiteUrl}:`,
            err,
         );
         propagateError(err);
         throw AppError.internal("Failed to get full analysis from website");
      }
   },
   id: "get-full-analysis-step",
   inputSchema: CreateKnowledgeAndIndexDocumentsInput,
   outputSchema: getFullAnalysisOutputSchema,
});

const createDocuments = createStep({
   description: "Create business documents from analysis",
   execute: async ({ inputData, runtimeContext }) => {
      const { fullAnalysis, userId, id, target, websiteUrl } = inputData;

      try {
         const inputPrompt = `

${fullAnalysis}

`;

         const result = await documentGenerationAgent.generate(
            [
               {
                  content: inputPrompt,
                  role: "user",
               },
            ],
            {
               output: createDocumentsOutputSchema,
               runtimeContext,
            },
         );

         await ingestUsage(result.usage as MastraLLMUsage, userId);
         if (!result?.object) {
            console.error(
               `[createDocuments] Failed to generate documents: documentGenerationAgent.generateVNext returned ${result ? "invalid result" : "null/undefined"}`,
            );
            propagateError(new Error("Failed to generate documents"));
            throw AppError.internal(
               "Failed to generate business documents from analysis",
            );
         }

         const { generatedDocuments } = result.object;
         return {
            generatedDocuments,
            id,
            target,
            userId,
            websiteUrl,
         };
      } catch (err) {
         console.error(
            `[createDocuments] Failed to create documents from analysis for ${target} ${id}:`,
            err,
         );
         propagateError(err);
         throw AppError.internal(
            "Failed to create business documents from analysis",
         );
      }
   },
   id: "create-documents-step",
   inputSchema: getFullAnalysisOutputSchema,
   outputSchema: createDocumentsOutputSchema,
});

const saveBrandDocumentsKnowledge = createStep({
   description:
      "Save brand documents knowledge to database and create embeddings",
   execute: async ({ inputData }) => {
      const { generatedDocuments, id } = inputData;

      try {
         const db = createDb({ databaseUrl: serverEnv.DATABASE_URL });
         const ragClient = createPgVector({
            pgVectorURL: serverEnv.PG_VECTOR_URL,
         });

         if (!generatedDocuments || generatedDocuments.length === 0) {
            throw AppError.validation("No documents provided for saving");
         }

         // Upload documents to storage
         const uploadedFiles = await uploadDocumentsToStorage(
            generatedDocuments,
            id,
            "brand",
         );

         // Update brand with uploaded files and status
         await updateBrand(db, id, { status: "completed", uploadedFiles });

         const knowledgeData: Parameters<
            typeof createBrandKnowledgeWithEmbeddingsBulk
         >[1] = [];

         for (const [index, document] of generatedDocuments.entries()) {
            const doc = MDocument.fromMarkdown(document.content);
            const chunks = await doc.chunk({
               maxSize: 128,
               overlap: 25,
               strategy: "markdown",
            });

            for (const chunk of chunks) {
               knowledgeData.push({
                  chunk: chunk.text,
                  externalId: id,
                  sourceId: `brand-doc-${index}`,
                  type: "document",
               });
            }
         }

         await createBrandKnowledgeWithEmbeddingsBulk(ragClient, knowledgeData);

         return {
            chunkCount: knowledgeData.length,
         };
      } catch (err) {
         console.error("failed to save brand documents", err);
         propagateError(err);
         throw AppError.internal(
            "Failed to save brand documents knowledge to database and vector store",
         );
      }
   },
   id: "save-brand-documents-knowledge-step",
   inputSchema: createDocumentsOutputSchema,
   outputSchema: CreateKnowledgeAndIndexDocumentsOutput,
});

const saveCompetitorDocumentsKnowledge = createStep({
   description:
      "Save competitor documents knowledge to database and create embeddings",
   execute: async ({ inputData }) => {
      const { generatedDocuments, id } = inputData;

      try {
         const db = createDb({ databaseUrl: serverEnv.DATABASE_URL });
         const ragClient = createPgVector({
            pgVectorURL: serverEnv.PG_VECTOR_URL,
         });

         if (!generatedDocuments || generatedDocuments.length === 0) {
            throw AppError.validation("No documents provided for saving");
         }

         // Upload documents to storage
         const uploadedFiles = await uploadDocumentsToStorage(
            generatedDocuments,
            id,
            "competitor",
         );

         await updateCompetitor(db, id, { status: "completed", uploadedFiles });

         const knowledgeData: Parameters<
            typeof createCompetitorKnowledgeWithEmbeddingsBulk
         >[1] = [];

         for (const [index, document] of generatedDocuments.entries()) {
            const doc = MDocument.fromMarkdown(document.content);
            const chunks = await doc.chunk({
               maxSize: 128,
               overlap: 25,
               strategy: "semantic-markdown",
            });

            for (const chunk of chunks) {
               knowledgeData.push({
                  chunk: chunk.text,
                  externalId: id,
                  sourceId: `competitor-doc-${index}`,
                  type: "document",
               });
            }
         }

         await createCompetitorKnowledgeWithEmbeddingsBulk(
            ragClient,
            knowledgeData,
         );

         return {
            chunkCount: knowledgeData.length,
         };
      } catch (err) {
         console.error("failed to save competitor documents", err);
         propagateError(err);
         throw AppError.internal(
            "Failed to save competitor documents knowledge to database and vector store",
         );
      }
   },
   id: "save-competitor-documents-knowledge-step",
   inputSchema: createDocumentsOutputSchema,
   outputSchema: CreateKnowledgeAndIndexDocumentsOutput,
});

export const createKnowledgeAndIndexDocumentsWorkflow = createWorkflow({
   description: "Create knowledge and index documents from analysis",
   id: "create-knowledge-and-index-documents",
   inputSchema: CreateKnowledgeAndIndexDocumentsInput,
   outputSchema: CreateKnowledgeAndIndexDocumentsOutput,
})
   .then(getFullAnalysis)
   .then(createDocuments)
   .branch([
      [
         async ({ inputData: { target } }) => target === "competitor",
         saveCompetitorDocumentsKnowledge,
      ],
      [
         async ({ inputData: { target } }) => target === "brand",
         saveBrandDocumentsKnowledge,
      ],
   ])
   .commit();
