import { prisma } from "@/lib/db";
import { htmlToPlainText } from "@/lib/ai/plain-text";

export async function buildProjectIssueCatalogText(
  projectId: string,
  maxIssues = 120,
): Promise<string> {
  const issues = await prisma.issue.findMany({
    where: { projectId },
    select: {
      id: true,
      issueKey: true,
      title: true,
      status: true,
      type: true,
      priority: true,
    },
    orderBy: { updatedAt: "desc" },
    take: maxIssues,
  });

  if (issues.length === 0) {
    return "No issues in this project yet.";
  }

  return issues
    .map(
      (i) =>
        `- ${i.issueKey} id=${i.id} [${i.type}] (${i.status}, ${i.priority}) ${i.title}`,
    )
    .join("\n");
}

export async function buildProjectIssueCatalogRich(
  projectId: string,
  maxIssues = 80,
): Promise<
  {
    issueKey: string;
    title: string;
    status: string;
    type: string;
    preview: string;
  }[]
> {
  const issues = await prisma.issue.findMany({
    where: { projectId },
    select: {
      issueKey: true,
      title: true,
      status: true,
      type: true,
      description: true,
    },
    orderBy: { updatedAt: "desc" },
    take: maxIssues,
  });

  return issues.map((i) => ({
    issueKey: i.issueKey,
    title: i.title,
    status: i.status,
    type: i.type,
    preview: htmlToPlainText(i.description ?? "").slice(0, 220),
  }));
}
