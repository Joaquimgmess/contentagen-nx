import type { DatabaseInstance } from "@packages/database/client";
import type { ContentSelect } from "@packages/database/schemas/content";
import { DatabaseError } from "@packages/errors";

/**
 * Check content access permissions
 * Returns both read and write permissions in a single call
 */
export async function hasContentAccess(
   dbClient: DatabaseInstance,
   content: ContentSelect,
   userId?: string,
   organizationId?: string,
): Promise<{ canRead: boolean; canWrite: boolean }> {
   try {
      const agent = await dbClient.query.agent.findFirst({
         where: (agent, { eq }) => eq(agent.id, content.agentId),
      });

      if (!agent) return { canRead: false, canWrite: false };

      const isOwner =
         (userId && agent.userId === userId) ||
         (organizationId && agent.organizationId === organizationId);

      if (isOwner) {
         return { canRead: true, canWrite: true };
      }

      return {
         canRead: content.shareStatus === "shared",
         canWrite: false,
      };
   } catch (err) {
      throw new DatabaseError(
         `Failed to check content access: ${(err as Error).message}`,
      );
   }
}
