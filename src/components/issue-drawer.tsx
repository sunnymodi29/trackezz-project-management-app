"use client";

import { IssueDetailView } from "@/components/issue-detail-view";
import { cn } from "@/lib/utils";

interface IssueDrawerProps {
  issueId: string;
  onClose: () => void;
  onNavigateIssue?: (issueId: string) => void;
}

export default function IssueDrawer({
  issueId,
  onClose,
  onNavigateIssue,
}: IssueDrawerProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col overflow-x-hidden bg-card shadow-2xl md:absolute md:bottom-auto md:left-auto md:top-0 md:h-full md:w-[520px] md:shrink-0 md:max-h-[calc(100vh-56px)]">
      <IssueDetailView
        issueId={issueId}
        variant="drawer"
        onClose={onClose}
        onNavigateIssue={onNavigateIssue}
        className="h-full"
      />
    </div>
  );
}
