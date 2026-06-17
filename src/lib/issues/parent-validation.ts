import { prisma } from "@/lib/db";

/** For new issues: parent must exist and belong to the same project. */
export async function assertParentIssueForCreate(
  projectId: string,
  parentId: string | null | undefined,
): Promise<void> {
  if (!parentId) return;
  const parent = await prisma.issue.findUnique({
    where: { id: parentId },
    select: { projectId: true },
  });
  if (!parent) throw new Error("NOT_FOUND: Parent issue not found");
  if (parent.projectId !== projectId) {
    throw new Error("Parent issue must belong to the same project");
  }
}

/**
 * Validates reparenting an existing issue. Throws on invalid parent, self-parent, wrong project, or cycle.
 */
export async function assertValidIssueParent(params: {
  issueId: string;
  projectId: string;
  parentId: string | null;
}): Promise<void> {
  const { issueId, projectId, parentId } = params;
  if (parentId === null) return;
  if (parentId === issueId) {
    throw new Error("An issue cannot be its own parent");
  }

  const parent = await prisma.issue.findUnique({
    where: { id: parentId },
    select: { id: true, projectId: true },
  });
  if (!parent) throw new Error("NOT_FOUND: Parent issue not found");
  if (parent.projectId !== projectId) {
    throw new Error("Parent issue must belong to the same project");
  }

  let cursor: string | null = parentId;
  while (cursor) {
    if (cursor === issueId) {
      throw new Error("Invalid parent: would create a cycle");
    }
    const row: { parentId: string | null } | null = await prisma.issue.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = row?.parentId ?? null;
  }
}
