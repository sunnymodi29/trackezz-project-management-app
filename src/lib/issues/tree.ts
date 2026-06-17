import type { Issue } from "@/types";
import { parseIssueNumberFromKey } from "@/lib/issues/issue-key";

export interface IssueTreeNode {
  issue: Issue;
  children: IssueTreeNode[];
}

function sortIssuesForTree(a: Issue, b: Issue): number {
  const na = parseIssueNumberFromKey(a.issueKey);
  const nb = parseIssueNumberFromKey(b.issueKey);
  const orderNum =
    (na ?? Number.MAX_SAFE_INTEGER) - (nb ?? Number.MAX_SAFE_INTEGER);
  return b.updatedAt.getTime() - a.updatedAt.getTime() || orderNum;
}

/** Issues with no parent, or parent missing from `issues` (orphan as root). */
export function getIssueRoots(issues: Issue[]): Issue[] {
  const idSet = new Set(issues.map((i) => i.id));
  return issues
    .filter((i) => !i.parentId || !idSet.has(i.parentId))
    .sort(sortIssuesForTree);
}

function attachChildren(
  parent: IssueTreeNode,
  byParent: Map<string | undefined, Issue[]>,
): void {
  const kids = (byParent.get(parent.issue.id) ?? []).slice().sort(sortIssuesForTree);
  parent.children = kids.map((issue) => {
    const node: IssueTreeNode = { issue, children: [] };
    attachChildren(node, byParent);
    return node;
  });
}

/** Full forest: one node per issue in `issues`, nested by parentId. */
export function buildIssueTree(issues: Issue[]): IssueTreeNode[] {
  const byParent = new Map<string | undefined, Issue[]>();
  for (const issue of issues) {
    const key = issue.parentId;
    const list = byParent.get(key) ?? [];
    list.push(issue);
    byParent.set(key, list);
  }
  const roots = getIssueRoots(issues);
  return roots.map((issue) => {
    const node: IssueTreeNode = { issue, children: [] };
    attachChildren(node, byParent);
    return node;
  });
}

/**
 * For a workflow-status column: roots are issues with this status whose parent is absent from `issues`
 * (so the chain is anchored in this column).
 */
export function buildIssueTreeForStatusColumn(
  issues: Issue[],
  statusKey: string,
): IssueTreeNode[] {
  const idSet = new Set(issues.map((i) => i.id));
  const roots = issues
    .filter((i) => {
      if (i.status !== statusKey) return false;
      if (!i.parentId) return true;
      return !idSet.has(i.parentId);
    })
    .sort(sortIssuesForTree);

  const byParent = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (!issue.parentId) continue;
    const list = byParent.get(issue.parentId) ?? [];
    list.push(issue);
    byParent.set(issue.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort(sortIssuesForTree);
  }

  function buildNode(issue: Issue): IssueTreeNode {
    const kids = (byParent.get(issue.id) ?? []).map(buildNode);
    return { issue, children: kids };
  }

  return roots.map((issue) => buildNode(issue));
}

/** All issue ids in subtree (including root). */
export function getDescendantIds(node: IssueTreeNode): string[] {
  const out = [node.issue.id];
  for (const c of node.children) {
    out.push(...getDescendantIds(c));
  }
  return out;
}

/**
 * Expand predicate matches to include every ancestor so the tree can render context.
 */
export function expandIssuesWithAncestors(
  issues: Issue[],
  matchIds: Set<string>,
): Issue[] {
  const byId = new Map(issues.map((i) => [i.id, i]));
  const keep = new Set<string>();

  function addAncestors(id: string) {
    let cur: string | undefined = id;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      keep.add(cur);
      const row = byId.get(cur);
      cur = row?.parentId ?? undefined;
    }
  }

  for (const id of matchIds) {
    if (byId.has(id)) addAncestors(id);
  }

  return issues.filter((i) => keep.has(i.id));
}

/** Subtree under `rootId` (root first), only issues in `issues`. */
export function buildSubtreeFromRoot(
  issues: Issue[],
  rootId: string,
): IssueTreeNode[] {
  const idSet = new Set(issues.map((i) => i.id));
  const root = issues.find((i) => i.id === rootId);
  if (!root) return [];

  const byParent = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (!issue.parentId || !idSet.has(issue.parentId)) continue;
    const list = byParent.get(issue.parentId) ?? [];
    list.push(issue);
    byParent.set(issue.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort(sortIssuesForTree);
  }

  function buildNode(issue: Issue): IssueTreeNode {
    const kids = (byParent.get(issue.id) ?? []).map(buildNode);
    return { issue, children: kids };
  }

  return [buildNode(root)];
}

/** DFS flat rows for rendering with expand/collapse. */
export function flattenIssueTree(
  nodes: IssueTreeNode[],
  collapsedIds: Set<string>,
  depth = 0,
): { node: IssueTreeNode; depth: number }[] {
  const out: { node: IssueTreeNode; depth: number }[] = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.children.length > 0 && !collapsedIds.has(node.issue.id)) {
      out.push(...flattenIssueTree(node.children, collapsedIds, depth + 1));
    }
  }
  return out;
}
