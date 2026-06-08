import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKFLOW_STATUSES } from "@/lib/projects/workflow-status";

export async function seedDefaultWorkflowStatuses(
  projectId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  await client.workflowStatus.createMany({
    data: DEFAULT_WORKFLOW_STATUSES.map((s) => ({
      projectId,
      key: s.key,
      label: s.label,
      color: s.color,
      position: s.position,
    })),
    skipDuplicates: true,
  });
}

export async function assertValidProjectStatus(
  projectId: string,
  statusKey: string,
) {
  const row = await prisma.workflowStatus.findUnique({
    where: { projectId_key: { projectId, key: statusKey } },
  });
  if (!row) {
    throw new Error(
      `INVALID_STATUS: "${statusKey}" is not a valid status for this project`,
    );
  }
  return row;
}
