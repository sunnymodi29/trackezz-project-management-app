import { prisma } from "@/lib/db";
import { recordAiMessageUsage } from "@/lib/billing/entitlements";

export async function recordAiUsageForProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });
  if (!project) throw new Error("NOT_FOUND: Project not found");
  await recordAiMessageUsage(project.organizationId);
}
