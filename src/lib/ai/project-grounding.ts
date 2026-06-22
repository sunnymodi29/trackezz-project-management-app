import { prisma } from "@/lib/db";
import { htmlToPlainText } from "@/lib/ai/plain-text";

function oneLinePlain(text: string, maxLen: number): string {
  return htmlToPlainText(text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

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
      description: true,
    },
    orderBy: { updatedAt: "desc" },
    take: maxIssues,
  });

  if (issues.length === 0) {
    return "No issues in this project yet.";
  }

  return issues
    .map((i) => {
      const preview = i.description
        ? oneLinePlain(i.description, 200)
        : "";
      const previewSuffix = preview ? ` | ${preview}` : "";
      return `- ${i.issueKey} id=${i.id} status=${i.status} type=${i.type} priority=${i.priority} ${i.title}${previewSuffix}`;
    })
    .join("\n");
}

/** One query: project summary plus members, labels, sprints, and epics for assistant grounding. */
export async function loadProjectWorkspaceForAssistant(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      key: true,
      name: true,
      icon: true,
      description: true,
      organization: { select: { name: true } },
      lead: { select: { name: true } },
      members: {
        take: 50,
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          user: { select: { name: true } },
        },
      },
      labels: {
        take: 80,
        orderBy: { name: "asc" },
        select: { name: true },
      },
      sprints: {
        take: 25,
        orderBy: { startDate: "desc" },
        select: {
          name: true,
          goal: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
      epics: {
        take: 30,
        orderBy: { name: "asc" },
        select: { name: true, description: true },
      },
    },
  });
}

export type ProjectWorkspaceForAssistant = NonNullable<
  Awaited<ReturnType<typeof loadProjectWorkspaceForAssistant>>
>;

export function formatProjectWorkspaceContextText(
  project: ProjectWorkspaceForAssistant,
): string {
  const lines: string[] = [];

  const desc = project.description
    ? oneLinePlain(project.description, 2400)
    : "";
  lines.push("Project summary:");
  lines.push(
    `- Name: ${project.name} (key=${project.key}, icon=${project.icon})`,
  );
  lines.push(`- Organization: ${project.organization.name}`);
  lines.push(
    `- Lead: ${project.lead?.name?.trim() || "None assigned"}`,
  );
  if (desc) {
    lines.push(`- Description: ${desc}`);
  }

  lines.push("");
  lines.push(
    `Project members (${project.members.length} listed; role is project role):`,
  );
  if (project.members.length === 0) {
    lines.push("- (none)");
  } else {
    for (const m of project.members) {
      const who = m.user.name?.trim() || "Unknown";
      lines.push(`- ${who} role=${m.role}`);
    }
  }

  lines.push("");
  lines.push("Labels:");
  if (project.labels.length === 0) {
    lines.push("- (none)");
  } else {
    for (const l of project.labels) {
      lines.push(`- ${l.name}`);
    }
  }

  lines.push("");
  lines.push("Sprints:");
  if (project.sprints.length === 0) {
    lines.push("- (none)");
  } else {
    for (const s of project.sprints) {
      const start = s.startDate.toISOString().slice(0, 10);
      const end = s.endDate.toISOString().slice(0, 10);
      const goal = s.goal ? oneLinePlain(s.goal, 240) : "";
      const goalPart = goal ? ` goal=${goal}` : "";
      lines.push(
        `- ${s.name} status=${s.status} ${start}→${end}${goalPart}`,
      );
    }
  }

  lines.push("");
  lines.push("Epics:");
  if (project.epics.length === 0) {
    lines.push("- (none)");
  } else {
    for (const e of project.epics) {
      const d = e.description
        ? oneLinePlain(e.description, 320)
        : "";
      const dPart = d ? ` | ${d}` : "";
      lines.push(`- ${e.name}${dPart}`);
    }
  }

  return lines.join("\n");
}

/** Lists canonical workflow keys so the model does not guess snake_case variants. */
export async function buildWorkflowStatusKeysCatalogText(
  projectId: string,
): Promise<string> {
  const rows = await prisma.workflowStatus.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
    select: { key: true, label: true },
  });
  if (rows.length === 0) {
    return "Workflow: no statuses configured for this project.";
  }
  return [
    "Workflow status keys for proposeIssueStatusChange.toStatus (copy the key= value exactly; keys use hyphens, not underscores):",
    ...rows.map((r) => `- key=${r.key} (${r.label})`),
  ].join("\n");
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
