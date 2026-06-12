import type { Project } from "@/types";

export function normalizeProjectKey(key: string): string {
  return key.trim().toUpperCase();
}

export function projectPath(key: string, subpath = ""): string {
  const base = `/dashboard/projects/${encodeURIComponent(key)}`;
  if (!subpath) return base;
  return `${base}${subpath.startsWith("/") ? subpath : `/${subpath}`}`;
}

export function findProjectByKey(
  projects: Project[],
  routeParam: string
): Project | undefined {
  const normalized = normalizeProjectKey(routeParam);
  return projects.find((p) => p.key.toUpperCase() === normalized);
}

/** Resolve URL segment as project key (preferred) or legacy id. */
export function resolveProjectFromParam(
  projects: Project[],
  routeParam: string
): Project | undefined {
  return (
    findProjectByKey(projects, routeParam) ??
    projects.find((p) => p.id === routeParam)
  );
}

export function projectKeyForId(
  projects: Project[],
  projectId: string
): string {
  return projects.find((p) => p.id === projectId)?.key ?? projectId;
}

/** Shareable issue URL: /dashboard/projects/{projectKey}/issues/{issueId} */
export function issuePath(projectKey: string, issueId: string): string {
  return `${projectPath(projectKey)}/issues/${encodeURIComponent(issueId)}`;
}

export function sprintPath(projectKey: string, sprintId: string): string {
  return `${projectPath(projectKey)}/sprints/${encodeURIComponent(sprintId)}`;
}

/** Link to a project member (members page). */
export function userPath(projectKey: string, userId: string): string {
  return `${projectPath(projectKey, "/members")}?member=${encodeURIComponent(userId)}`;
}

export function getIssueShareUrl(
  origin: string,
  projectKey: string,
  issueId: string
): string {
  return `${origin}${issuePath(projectKey, issueId)}`;
}

export { getCommentShareUrl, issuePathWithComment } from "@/lib/comments/share";
