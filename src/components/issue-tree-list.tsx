"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IssueTreeNode } from "@/lib/issues/tree";
import { flattenIssueTree } from "@/lib/issues/tree";

function collectExpandableIds(nodes: IssueTreeNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    if (n.children.length > 0) {
      ids.push(n.issue.id);
      ids.push(...collectExpandableIds(n.children));
    }
  }
  return ids;
}

function treeHasNested(nodes: IssueTreeNode[]): boolean {
  for (const n of nodes) {
    if (n.children.length > 0) return true;
    if (treeHasNested(n.children)) return true;
  }
  return false;
}

export function IssueTreeList({
  tree,
  renderRow,
  className,
  showToolbar,
}: {
  tree: IssueTreeNode[];
  renderRow: (args: {
    node: IssueTreeNode;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
    onToggleExpand: () => void;
    expandControl: ReactNode;
  }) => ReactNode;
  className?: string;
  /** When true, shows Expand all / Collapse all when the tree has nested rows */
  showToolbar?: boolean;
}) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggle = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsedIds(new Set()), []);
  const collapseAll = useCallback(() => {
    setCollapsedIds(new Set(collectExpandableIds(tree)));
  }, [tree]);

  const flat = useMemo(
    () => flattenIssueTree(tree, collapsedIds),
    [tree, collapsedIds],
  );

  const nested = useMemo(() => treeHasNested(tree), [tree]);

  return (
    <div className={className}>
      {showToolbar && nested && (
        <div className="flex gap-2 text-[10px] text-muted-foreground px-6 py-1 border-b border-border/40">
          <button
            type="button"
            className="hover:text-foreground underline"
            onClick={expandAll}
          >
            Expand all
          </button>
          <button
            type="button"
            className="hover:text-foreground underline"
            onClick={collapseAll}
          >
            Collapse all
          </button>
        </div>
      )}
      {flat.map(({ node, depth }) => {
        const hasChildren = node.children.length > 0;
        const expanded = !collapsedIds.has(node.issue.id);
        const onToggleExpand = () => toggle(node.issue.id);
        const expandControl = hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className={cn(
              "p-0.5 rounded-sm hover:bg-muted text-muted-foreground shrink-0 transition-colors",
              expanded ? "bg-muted" : "bg-muted/50",
            )}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0 inline-block" aria-hidden />
        );

        return (
          <div key={node.issue.id}>
            {renderRow({
              node,
              depth,
              hasChildren,
              expanded,
              onToggleExpand,
              expandControl,
            })}
          </div>
        );
      })}
    </div>
  );
}
