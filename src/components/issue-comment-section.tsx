"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Comment, Issue, User } from "@/types";
import type { Editor } from "@tiptap/react";
import { Avatar, Button, Tooltip } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { hasRichTextContent, looksLikeHtml } from "@/lib/rich-text";
import { formatRelativeTime } from "@/lib/utils";
import { parseCommentContent, linkifyPlainText } from "@/lib/comments/render";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageLightbox } from "@/components/image-lightbox";
import { countComments } from "@/lib/comments/tree";
import { commentDomId, getCommentShareUrl } from "@/lib/comments/share";
import { EmojiPicker } from "@/components/emoji-picker";
import {
  addIssueComment,
  addIssueCommentWithUpload,
  toggleCommentReaction,
  updateComment,
  deleteComment,
} from "@/lib/actions/comments";
import {
  MessageSquare,
  Paperclip,
  Send,
  Smile,
  Reply,
  X,
  Pencil,
  Trash2,
  Link2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
interface IssueCommentSectionProps {
  issue: Issue;
  currentUser: User;
  projectKey: string;
  highlightCommentId?: string;
  onIssueUpdate: (issue: Issue) => void;
}

export function IssueCommentSection({
  issue,
  currentUser,
  projectKey,
  highlightCommentId,
  onIssueUpdate,
}: IssueCommentSectionProps) {
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [commentText, setCommentText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const commentTree = useMemo(() => issue.comments, [issue.comments]);
  const totalCount = countComments(flattenComments(commentTree));
  useEffect(() => {
    if (!highlightCommentId) return;

    let cancelled = false;
    let attempts = 0;

    const scrollToComment = () => {
      if (cancelled) return;
      const el = document.getElementById(commentDomId(highlightCommentId));
      if (!el) {
        if (attempts++ < 40) setTimeout(scrollToComment, 100);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    scrollToComment();
    return () => {
      cancelled = true;
    };
  }, [highlightCommentId, issue.id, commentTree]);

  const scrollToComposer = useCallback(() => {
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      editorRef.current?.commands.focus();
    });
  }, []);

  const handleReply = useCallback(
    (comment: Comment) => {
      setReplyTo(comment);
      scrollToComposer();
    },
    [scrollToComposer],
  );

  const submitComment = async (content: string, file?: File | null) => {
    if (submitting) return;
    if (!hasRichTextContent(content) && !file) return;

    setSubmitting(true);
    try {
      let updated: Issue;
      if (file) {
        const formData = new FormData();
        formData.set("issueId", issue.id);
        formData.set("content", content);
        if (replyTo) formData.set("parentId", replyTo.id);
        formData.set("file", file);
        updated = await addIssueCommentWithUpload(formData);
      } else {
        updated = await addIssueComment(issue.id, content, {
          parentId: replyTo?.id,
        });
      }
      onIssueUpdate(updated);
      setCommentText("");
      setPendingFile(null);
      setReplyTo(null);
      router.refresh();
    } catch (e) {
      console.error(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      const updated = await toggleCommentReaction(commentId, emoji);
      onIssueUpdate(updated);
      router.refresh();
    } catch (e) {
      console.error(e instanceof Error ? e.message : "Failed to react");
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      const updated = await updateComment(commentId, content);
      onIssueUpdate(updated);
      router.refresh();
    } catch (e) {
      console.error(e instanceof Error ? e.message : "Failed to edit comment");
    }
  };

  const confirmDeleteComment = async () => {
    if (!deleteCommentId) return;
    setDeletingComment(true);
    try {
      const updated = await deleteComment(deleteCommentId);
      onIssueUpdate(updated);
      setDeleteCommentId(null);
      router.refresh();
    } catch (e) {
      console.error(
        e instanceof Error ? e.message : "Failed to delete comment",
      );
    } finally {
      setDeletingComment(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const editor = editorRef.current;
    if (editor) {
      editor.chain().focus().insertContent(emoji).run();
      setCommentText(editor.getHTML());
    } else {
      setCommentText((t) => t + emoji);
    }
  };

  const postEmojiComment = async (emoji: string) => {
    await submitComment(emoji);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 comments-container">
        {commentTree.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No comments yet
          </div>
        )}
        {commentTree.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            issueId={issue.id}
            projectKey={projectKey}
            currentUserId={currentUser.id}
            depth={0}
            highlightCommentId={highlightCommentId}
            onReply={handleReply}
            onReaction={handleReaction}
            onEdit={handleEdit}
            onDeleteRequest={setDeleteCommentId}
            onImageClick={(src, alt) => setLightboxImage({ src, alt })}
          />
        ))}
      </div>

      <ConfirmDialog
        open={deleteCommentId !== null}
        title="Delete comment?"
        description="This comment and any replies will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        loading={deletingComment}
        onClose={() => !deletingComment && setDeleteCommentId(null)}
        onConfirm={() => void confirmDeleteComment()}
      />

      <ImageLightbox
        open={lightboxImage !== null}
        src={lightboxImage?.src ?? ""}
        alt={lightboxImage?.alt}
        onClose={() => setLightboxImage(null)}
      />

      <div
        ref={composerRef}
        className="border-t border-border p-4 shrink-0 scroll-mt-4"
      >
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs">
            <span className="text-muted-foreground">
              Replying to{" "}
              <span className="font-medium text-foreground">
                {replyTo.author.name}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {pendingFile && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-primary/5 border border-primary/20 text-xs">
            <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate flex-1">{pendingFile.name}</span>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <Avatar
            src={currentUser.avatarUrl}
            name={currentUser.name}
            size="sm"
          />
          <div className="flex-1 relative rounded-lg border border-border bg-muted/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all overflow-hidden">
            <RichTextEditor
              value={commentText}
              onChange={setCommentText}
              variant="compact"
              borderless
              editorRef={editorRef}
              minHeight="60px"
              className="bg-transparent"
              placeholder={
                replyTo
                  ? `Reply to ${replyTo.author.name}... (Ctrl+Enter)`
                  : "Add a comment... (Ctrl+Enter to submit)"
              }
              onCtrlEnter={() => void submitComment(commentText, pendingFile)}
            />
            <div className="flex items-center justify-between p-2 border-t border-border/60">
              <div className="flex items-center gap-1 relative">
                <Tooltip content="Add emoji" side="top">
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((o) => !o)}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                    aria-label="Add emoji"
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <EmojiPicker
                  open={emojiOpen}
                  onClose={() => setEmojiOpen(false)}
                  onSelect={(emoji) => {
                    if (!hasRichTextContent(commentText) && !pendingFile) {
                      void postEmojiComment(emoji);
                    } else {
                      insertEmoji(emoji);
                    }
                  }}
                  title="Insert emoji or post"
                />
                <Tooltip content="Attach file" side="top">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPendingFile(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => void submitComment(commentText, pendingFile)}
                disabled={
                  (!hasRichTextContent(commentText) && !pendingFile) ||
                  submitting
                }
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3 w-3" /> {submitting ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function flattenComments(comments: Comment[]): Comment[] {
  const out: Comment[] = [];
  const walk = (list: Comment[]) => {
    for (const c of list) {
      out.push(c);
      if (c.replies?.length) walk(c.replies);
    }
  };
  walk(comments);
  return out;
}

function CommentItem({
  comment,
  issueId,
  projectKey,
  currentUserId,
  depth,
  highlightCommentId,
  onReply,
  onReaction,
  onEdit,
  onDeleteRequest,
  onImageClick,
}: {
  comment: Comment;
  issueId: string;
  projectKey: string;
  currentUserId: string;
  depth: number;
  highlightCommentId?: string;
  onReply: (c: Comment) => void;
  onReaction: (commentId: string, emoji: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDeleteRequest: (commentId: string) => void;
  onImageClick: (src: string, alt: string) => void;
}) {
  const [reactPickerOpen, setReactPickerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reactionGroups = groupReactions(comment.reactions, currentUserId);
  const isAuthor = comment.authorId === currentUserId;
  const isHighlighted = highlightCommentId === comment.id;

  const saveEdit = async () => {
    if (!hasRichTextContent(editText)) return;
    setSaving(true);
    try {
      await onEdit(comment.id, editText);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const url = getCommentShareUrl(
      window.location.origin,
      projectKey,
      issueId,
      comment.id,
    );
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      console.error("Failed to copy comment link");
    }
  };

  return (
    <div className={cn(depth > 0 && "ml-8 mt-3")}>
      <div
        id={commentDomId(comment.id)}
        className={cn(
          "flex gap-3",
          isHighlighted &&
            "comment-highlight-target -mx-2 px-2 py-1.5 rounded-tr-lg rounded-br-lg border-l-4 border-primary! bg-primary/5",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Avatar
          src={comment.author.avatarUrl}
          name={comment.author.name}
          size="sm"
        />
        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-foreground">
            {comment.author.name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {comment.updatedAt.getTime() > comment.createdAt.getTime() + 1000 && (
            <span className="text-[10px] text-muted-foreground italic">
              (edited)
            </span>
          )}
          {!isEditing && (
            <Tooltip
              content={linkCopied ? "Copied!" : "Copy comment link"}
              side="top"
            >
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                aria-label={linkCopied ? "Link copied" : "Copy comment link"}
                className={cn(
                  "ml-auto rounded p-1 text-muted-foreground transition-all duration-200 ease-out hover:bg-accent hover:text-foreground",
                  linkCopied || hovered
                    ? "translate-x-0 opacity-100 pointer-events-auto"
                    : "-translate-x-2 opacity-0 pointer-events-none",
                )}
              >
                {linkCopied ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 rotate-315" />
                )}
              </button>
            </Tooltip>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <RichTextEditor
              value={editText}
              onChange={setEditText}
              variant="compact"
              minHeight="72px"
              onCtrlEnter={() => void saveEdit()}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setIsEditing(false);
                  setEditText(comment.content);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={saving || !hasRichTextContent(editText)}
                onClick={() => void saveEdit()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <CommentBody
              content={comment.content}
              onImageClick={onImageClick}
            />
          </div>
        )}

        {!isEditing && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2 relative">
            {reactionGroups.map(({ emoji, count, reacted }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => void onReaction(comment.id, emoji)}
                className={cn(
                  "flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  reacted
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-muted hover:bg-accent",
                )}
              >
                {emoji} {count}
              </button>
            ))}
            <Tooltip content="Add reaction" side="top">
              <button
                type="button"
                onClick={() => setReactPickerOpen((o) => !o)}
                className="flex items-center gap-0.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
                aria-label="Add reaction"
              >
                <Smile className="h-3 w-3" />
              </button>
            </Tooltip>
            <EmojiPicker
              open={reactPickerOpen}
              onClose={() => setReactPickerOpen(false)}
              onSelect={(emoji) => void onReaction(comment.id, emoji)}
              className="left-0"
              title="React"
            />
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
            {isAuthor && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditText(comment.content);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRequest(comment.id)}
                  className="flex items-center gap-1 text-[10px] font-medium text-destructive/80 hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </>
            )}
          </div>
        )}

        </div>
      </div>

      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          issueId={issueId}
          projectKey={projectKey}
          currentUserId={currentUserId}
          depth={depth + 1}
          highlightCommentId={highlightCommentId}
          onReply={onReply}
          onReaction={onReaction}
          onEdit={onEdit}
          onDeleteRequest={onDeleteRequest}
          onImageClick={onImageClick}
        />
      ))}
    </div>
  );
}

function CommentBody({
  content,
  onImageClick,
}: {
  content: string;
  onImageClick: (src: string, alt: string) => void;
}) {
  const segments = parseCommentContent(content);
  return (
    <div className="text-sm text-foreground leading-relaxed space-y-2">
      {segments.map((seg, i) => {
        if (seg.type === "image") {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onImageClick(seg.url, seg.alt)}
              className="block cursor-zoom-in rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={seg.url}
                alt={seg.alt}
                className="max-w-full rounded-md border border-border max-h-48 object-contain hover:opacity-90 transition-opacity"
              />
            </button>
          );
        }
        if (seg.type === "link") {
          return (
            <a
              key={i}
              href={seg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium break-all"
            >
              <Paperclip className="h-3 w-3 shrink-0" />
              {seg.label}
            </a>
          );
        }
        if (!seg.value) return null;
        if (looksLikeHtml(seg.value)) {
          return (
            <RichTextContent
              key={i}
              content={seg.value}
              className="text-foreground"
            />
          );
        }
        return <PlainCommentText key={i} text={seg.value} />;
      })}
    </div>
  );
}

function PlainCommentText({ text }: { text: string }) {
  const parts = linkifyPlainText(text);
  const hasLinks = parts.some((p) => p.type === "autolink");
  if (!hasLinks && !text.trim()) return null;

  return (
    <p className="break-words">
      {parts.map((part, i) => {
        if (part.type === "plain") {
          return <span key={i}>{part.value}</span>;
        }
        return (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {part.display}
          </a>
        );
      })}
    </p>
  );
}

function groupReactions(
  reactions: Comment["reactions"],
  currentUserId: string,
) {
  const map = new Map<string, { count: number; reacted: boolean }>();
  for (const r of reactions) {
    const entry = map.get(r.emoji) ?? { count: 0, reacted: false };
    entry.count += 1;
    if (r.userId === currentUserId) entry.reacted = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    reacted: data.reacted,
  }));
}
