"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { IssueDetailView } from "@/components/issue-detail-view";
import { COMMENT_QUERY_PARAM } from "@/lib/comments/share";
import { projectPath } from "@/lib/projects/route";
import { ArrowLeft } from "lucide-react";

function IssuePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectKey = params.projectId as string;
  const issueId = params.issueId as string;
  const highlightCommentId = searchParams.get(COMMENT_QUERY_PARAM) ?? undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-background">
      <div className="px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <Link
          href={projectPath(projectKey, "/list")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to issues
        </Link>
      </div>
      <div className="flex-1 min-h-0 flex justify-center overflow-hidden">
        <IssueDetailView
          issueId={issueId}
          variant="page"
          highlightCommentId={highlightCommentId}
          className="w-full"
        />
      </div>
    </div>
  );
}

export default function IssueFullPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] bg-background" />}>
      <IssuePageContent />
    </Suspense>
  );
}
