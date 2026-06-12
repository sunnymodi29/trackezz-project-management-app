import { issuePath } from "@/lib/projects/route";
import type { Comment } from "@/types";

export const COMMENT_QUERY_PARAM = "comment";

export function commentDomId(commentId: string): string {
  return `comment-${commentId}`;
}

/** Short display id for comments (first 8 chars of cuid). */
export function commentShortId(commentId: string): string {
  return commentId.slice(0, 8);
}

export function issuePathWithComment(
  projectKey: string,
  issueId: string,
  commentId: string,
): string {
  const base = issuePath(projectKey, issueId);
  return `${base}?${COMMENT_QUERY_PARAM}=${encodeURIComponent(commentId)}`;
}

export function getCommentShareUrl(
  origin: string,
  projectKey: string,
  issueId: string,
  commentId: string,
): string {
  return `${origin}${issuePathWithComment(projectKey, issueId, commentId)}`;
}

export function findCommentById(
  comments: Comment[],
  commentId: string,
): Comment | undefined {
  for (const comment of comments) {
    if (comment.id === commentId) return comment;
    if (comment.replies?.length) {
      const found = findCommentById(comment.replies, commentId);
      if (found) return found;
    }
  }
  return undefined;
}
