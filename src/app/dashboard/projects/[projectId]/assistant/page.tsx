"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import {
  ASSISTANT_CHAT_QUERY,
  getAssistantConversationShareUrl,
  resolveProjectFromParam,
} from "@/lib/projects/route";
import { useDataStore } from "@/store/data-store";
import { AssistantMarkdown } from "@/components/assistant-markdown";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, Button, Input, Skeleton, Tooltip } from "@/components/ui";
import {
  createAiConversation,
  deleteAiConversation,
  listAiConversations,
  loadAiConversationMessages,
  renameAiConversation,
} from "@/lib/actions/ai-conversations";
import {
  Bot,
  Check,
  ArrowDown,
  Copy,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ChatListSkeleton() {
  const rows = [
    "max-w-[76%]",
    "max-w-[76%]",
    "max-w-[76%]",
    "max-w-[76%]",
    "max-w-[76%]",
  ] as const;
  return (
    <ul
      className="list-none px-2 py-1.5 space-y-1.5"
      role="status"
      aria-live="polite"
      aria-label="Loading chats"
    >
      {rows.map((widthClass, i) => (
        <li key={i} className="flex items-center gap-1.5 rounded-sm px-2 py-2">
          <Skeleton
            className={cn("h-3.5 flex-1 rounded-md min-w-0", widthClass)}
          />
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm opacity-60" />
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm opacity-60" />
        </li>
      ))}
    </ul>
  );
}

export default function ProjectAssistantPage() {
  return (
    <Suspense
      fallback={<div className="h-[calc(100vh-56px)] bg-background shrink-0" />}
    >
      <ProjectAssistantContent />
    </Suspense>
  );
}

function textFromMessage(m: UIMessage) {
  return (m.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

function ProjectAssistantContent() {
  const params = useParams();
  const routeParam = params.projectId as string;
  const { projects } = useDataStore();
  const project = useMemo(
    () => resolveProjectFromParam(projects, routeParam) ?? projects[0],
    [projects, routeParam],
  );

  const [conversations, setConversations] = useState<
    { id: string; title: string; createdAt: Date }[]
  >([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null,
  );
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editTitleInputRef = useRef<HTMLInputElement>(null);
  const [pendingDeleteConversationId, setPendingDeleteConversationId] =
    useState<string | null>(null);
  const [deleteConversationLoading, setDeleteConversationLoading] =
    useState(false);
  const [copiedChatLinkId, setCopiedChatLinkId] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get(ASSISTANT_CHAT_QUERY)?.trim() ?? "";

  const refreshList = useCallback(async () => {
    if (!project?.id) return;
    setLoadingList(true);
    try {
      const rows = await listAiConversations(project.id);
      setConversations(rows);
    } finally {
      setLoadingList(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (!editingConversationId || !editTitleInputRef.current) return;
    editTitleInputRef.current.focus();
    editTitleInputRef.current.select();
  }, [editingConversationId]);

  const startEditingConversationTitle = useCallback(
    (c: { id: string; title: string }) => {
      setEditingConversationId(c.id);
      setEditingTitle(c.title);
    },
    [],
  );

  const cancelEditingConversationTitle = useCallback(() => {
    setEditingConversationId(null);
    setEditingTitle("");
  }, []);

  const commitEditingConversationTitle = useCallback(
    async (id: string) => {
      const original = conversations.find((x) => x.id === id)?.title ?? "";
      const next = editingTitle.trim();
      setEditingConversationId(null);
      setEditingTitle("");
      if (next === original) return;
      if (!next) {
        await refreshList();
        return;
      }
      try {
        await renameAiConversation(id, next);
        await refreshList();
      } catch (err) {
        console.error(err);
        await refreshList();
      }
    },
    [conversations, editingTitle, refreshList],
  );

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const selectConversation = useCallback(async (id: string) => {
    setEditingConversationId(null);
    setEditingTitle("");
    setConversationId(id);
    setLoadingMessages(true);
    setInitialMessages(null);
    try {
      const msgs = await loadAiConversationMessages(id);
      setInitialMessages(msgs);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const startNewChat = useCallback(async () => {
    if (!project?.id) return;
    const row = await createAiConversation(project.id);
    await refreshList();
    await selectConversation(row.id);
  }, [project?.id, refreshList, selectConversation]);

  const removeConversation = useCallback(
    async (id: string) => {
      await deleteAiConversation(id);
      if (conversationId === id) {
        setConversationId(null);
        setInitialMessages(null);
      }
      await refreshList();
    },
    [conversationId, refreshList],
  );

  const pendingDeleteTitle = useMemo(() => {
    if (!pendingDeleteConversationId) return "";
    return (
      conversations.find((x) => x.id === pendingDeleteConversationId)?.title ??
      "This chat"
    );
  }, [conversations, pendingDeleteConversationId]);

  const confirmRemoveConversation = useCallback(async () => {
    if (!pendingDeleteConversationId) return;
    setDeleteConversationLoading(true);
    try {
      await removeConversation(pendingDeleteConversationId);
    } finally {
      setDeleteConversationLoading(false);
      setPendingDeleteConversationId(null);
    }
  }, [pendingDeleteConversationId, removeConversation]);

  const copyChatLink = useCallback(
    async (conversationRowId: string) => {
      if (!project?.key) return;
      const url = getAssistantConversationShareUrl(
        window.location.origin,
        project.key,
        conversationRowId,
      );
      try {
        await navigator.clipboard.writeText(url);
        setCopiedChatLinkId(conversationRowId);
        setTimeout(() => setCopiedChatLinkId(null), 1500);
      } catch {
        console.error("Failed to copy chat link");
      }
    },
    [project?.key],
  );

  const bootstrapped = useRef(false);
  /**
   * Last `chat` query value from the URL. We only apply URL → selection when the
   * query actually changed, so stale `?chat=` after `router.replace` cannot
   * override a newly selected conversation (e.g. New chat).
   */
  const prevUrlChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    bootstrapped.current = false;
    prevUrlChatIdRef.current = null;
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id || loadingList || bootstrapped.current) return;
    if (conversations.length === 0) {
      bootstrapped.current = true;
      void startNewChat();
    }
  }, [project?.id, loadingList, conversations.length, startNewChat]);

  useEffect(() => {
    if (!project?.id || loadingList || conversations.length === 0) return;

    const prev = prevUrlChatIdRef.current;
    const urlChanged = prev !== null && prev !== urlChatId;
    const initialDeepLink = prev === null && urlChatId.length > 0;
    const shouldApplyChatFromUrl = urlChanged || initialDeepLink;
    prevUrlChatIdRef.current = urlChatId;

    const urlMatch = urlChatId && conversations.find((c) => c.id === urlChatId);

    if (urlChatId && !urlMatch) {
      const params = new URLSearchParams(window.location.search);
      params.delete(ASSISTANT_CHAT_QUERY);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }

    if (urlMatch) {
      if (conversationId !== urlMatch.id && shouldApplyChatFromUrl) {
        void selectConversation(urlMatch.id);
      }
      return;
    }

    if (!conversationId) {
      void selectConversation(conversations[0]!.id);
    }
  }, [
    project?.id,
    loadingList,
    conversations,
    conversationId,
    urlChatId,
    pathname,
    router,
    selectConversation,
  ]);

  useEffect(() => {
    if (!project?.key || !conversationId) return;
    if (searchParams.get(ASSISTANT_CHAT_QUERY) === conversationId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(ASSISTANT_CHAT_QUERY, conversationId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [project?.key, conversationId, pathname, router, searchParams]);

  if (!project) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No project selected.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 bg-background">
      <aside className="w-56 border-r border-border flex flex-col shrink-0">
        <div className="p-3 py-3.5 border-b border-border flex items-center justify-between gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Chats
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2"
            onClick={() => void startNewChat()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-2 space-y-1">
            {loadingList && conversations.length === 0 ? (
              <ChatListSkeleton />
            ) : null}
            {conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-0.5 rounded-md min-w-0 hover:bg-accent/60 pe-1.5",
                  conversationId === c.id && "bg-muted",
                  editingConversationId === c.id && "pe-0",
                )}
              >
                {editingConversationId === c.id ? (
                  <Input
                    ref={editTitleInputRef}
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => void commitEditingConversationTitle(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        editTitleInputRef.current?.blur();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEditingConversationTitle();
                      }
                    }}
                    maxLength={200}
                    className="h-7 flex-1 min-w-0 text-xs px-2 py-1"
                    aria-label="Chat title"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void selectConversation(c.id)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        startEditingConversationTitle(c);
                      }}
                      className={cn(
                        "flex-1 min-w-0 text-left text-xs px-2 py-1.5 rounded-md truncate",
                      )}
                    >
                      {c.title}
                    </button>
                    <Tooltip
                      content={
                        copiedChatLinkId === c.id ? "Copied!" : "Copy link"
                      }
                      side="top"
                      className="shrink-0"
                    >
                      <button
                        type="button"
                        className={cn(
                          "p-1 rounded-sm shrink-0 opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground",
                          copiedChatLinkId === c.id && "opacity-100",
                        )}
                        aria-label={
                          copiedChatLinkId === c.id
                            ? "Link copied"
                            : "Copy link to this chat"
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void copyChatLink(c.id);
                        }}
                      >
                        {copiedChatLinkId === c.id ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </Tooltip>
                    <Tooltip
                      content="Rename Chat"
                      side="top"
                      className="shrink-0"
                    >
                      <button
                        type="button"
                        className="p-1 rounded-sm shrink-0 opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground"
                        aria-label="Rename chat"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startEditingConversationTitle(c);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </Tooltip>
                    <Tooltip
                      content="Delete Chat"
                      side="top"
                      className="shrink-0"
                    >
                      <button
                        type="button"
                        className="p-1 rounded-sm shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        aria-label="Delete chat"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPendingDeleteConversationId(c.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Tooltip>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2 shrink-0">
          <Bot className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              Project assistant
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {project.name} — grounded on your issue catalog
            </div>
          </div>
        </div>

        {loadingMessages || !conversationId || initialMessages === null ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            {loadingMessages
              ? "Loading conversation…"
              : "Select or start a chat"}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <AssistantChat
              key={conversationId}
              projectId={project.id}
              conversationId={conversationId}
              initialMessages={initialMessages}
              onAssistantTurnComplete={refreshList}
            />
          </div>
        )}
      </main>

      <ConfirmDialog
        open={pendingDeleteConversationId !== null}
        title="Delete this chat?"
        description={`“${pendingDeleteTitle}” will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleteConversationLoading}
        onClose={() => {
          if (!deleteConversationLoading) {
            setPendingDeleteConversationId(null);
          }
        }}
        onConfirm={() => void confirmRemoveConversation()}
      />
    </div>
  );
}

function userMessageAuthorLabel(
  currentUser: { name: string; email: string } | null | undefined,
) {
  if (!currentUser) return "You";
  const n = currentUser.name?.trim();
  return n || currentUser.email || "You";
}

/** Elapsed ms thresholds → phase index (each phase shows one distinct line; no repeats). */
const ASSISTANT_WAIT_THRESHOLDS_MS = [0, 650, 2000, 4500, 7500] as const;

const ASSISTANT_WAIT_LINES = [
  "Taking a look at your question…",
  "Pulling in context from this project…",
  "Shaping an answer for you…",
  "Still generating — thanks for your patience.",
  "This is taking longer than usual. You can stop and try a shorter question if you like.",
] as const;

function waitPhaseFromElapsed(ms: number): number {
  let phase = 0;
  for (let i = 1; i < ASSISTANT_WAIT_THRESHOLDS_MS.length; i++) {
    if (ms >= ASSISTANT_WAIT_THRESHOLDS_MS[i]!) phase = i;
  }
  return phase;
}

function AssistantGeneratingBubble({ phase }: { phase: number }) {
  const line =
    ASSISTANT_WAIT_LINES[Math.min(phase, ASSISTANT_WAIT_LINES.length - 1)]!;
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-primary/20 bg-muted/25 mr-auto max-w-md rounded-tl-none",
        "px-3 py-2.5 text-sm shadow-sm animate-in fade-in duration-200",
      )}
      role="status"
      aria-live="polite"
      aria-relevant="text"
      aria-busy="true"
    >
      <div className="flex items-start gap-2.5">
        <Loader2 className="h-4 w-4 shrink-0 text-primary mt-0.5 animate-spin [animation-duration:1.05s]" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-xs font-medium text-foreground">
            TrackEzz Assistant
          </div>
          <p
            key={line}
            className="text-[13px] text-muted-foreground leading-snug animate-in fade-in duration-300"
          >
            {line}
          </p>
        </div>
      </div>
    </div>
  );
}

function AssistantChat({
  projectId,
  conversationId,
  initialMessages,
  onAssistantTurnComplete,
}: {
  projectId: string;
  conversationId: string;
  initialMessages: UIMessage[];
  onAssistantTurnComplete?: () => void;
}) {
  const [text, setText] = useState("");
  const { currentUser } = useDataStore();

  const { messages, sendMessage, status, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/ai/project-chat",
      credentials: "include",
      body: { projectId },
    }),
    onFinish: ({ isAbort, isError }) => {
      if (isAbort || isError) return;
      onAssistantTurnComplete?.();
    },
  });

  const busy = status === "submitted" || status === "streaming";

  const waitingForAssistantContent = useMemo(() => {
    const last = messages.length ? messages[messages.length - 1] : undefined;
    return (
      busy &&
      (!last ||
        last.role === "user" ||
        (last.role === "assistant" && textFromMessage(last).trim() === ""))
    );
  }, [busy, messages]);

  const waitStartRef = useRef<number | null>(null);
  const [waitPhase, setWaitPhase] = useState(0);

  useEffect(() => {
    if (!waitingForAssistantContent) {
      waitStartRef.current = null;
      setWaitPhase(0);
      return;
    }
    if (waitStartRef.current === null) {
      waitStartRef.current = Date.now();
    }
    const tick = () => {
      const start = waitStartRef.current;
      if (start === null) return;
      const next = waitPhaseFromElapsed(Date.now() - start);
      setWaitPhase((prev) => (prev === next ? prev : next));
    };
    tick();
    const id = window.setInterval(tick, 180);
    return () => window.clearInterval(id);
  }, [waitingForAssistantContent]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const updateScrollToBottomVisibility = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollToBottom(distanceFromBottom > 80);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollToBottomVisibility();
    el.addEventListener("scroll", updateScrollToBottomVisibility, {
      passive: true,
    });
    const ro = new ResizeObserver(updateScrollToBottomVisibility);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollToBottomVisibility);
      ro.disconnect();
    };
  }, [updateScrollToBottomVisibility, conversationId]);

  useEffect(() => {
    updateScrollToBottomVisibility();
  }, [messages, waitingForAssistantContent, updateScrollToBottomVisibility]);

  const scrollChatToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <div className="relative flex-1 min-h-0 min-w-0">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        >
          <div className="px-4 py-4 space-y-3 max-w-5xl mx-auto">
            {messages.length === 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 opacity-50" />
                Ask about scope, risks, related issues, or next steps. Replies
                cite issue keys from your catalog.
              </div>
            )}
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              if (
                isLast &&
                m.role === "assistant" &&
                busy &&
                textFromMessage(m).trim() === ""
              ) {
                return null;
              }
              return (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    m.role === "user"
                      ? "border-primary/25 bg-primary/5 ml-auto max-w-md rounded-tr-none"
                      : "border-border bg-muted/30 mr-auto max-w-2xl rounded-tl-none",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5 min-w-0">
                    {m.role === "user" && currentUser && (
                      <Avatar
                        src={currentUser.avatarUrl}
                        name={currentUser.name}
                        size="xs"
                        className="shrink-0"
                      />
                    )}
                    {m.role === "assistant" && (
                      <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground truncate">
                        {m.role === "user"
                          ? userMessageAuthorLabel(currentUser)
                          : "TrackEzz Assistant"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {m.role === "user" ? "Question" : "Reply"}
                      </div>
                    </div>
                  </div>
                  {m.role === "assistant" ? (
                    <AssistantMarkdown>{textFromMessage(m)}</AssistantMarkdown>
                  ) : (
                    <div className="whitespace-pre-wrap wrap-break-word">
                      {textFromMessage(m)}
                    </div>
                  )}
                </div>
              );
            })}
            {waitingForAssistantContent ? (
              <AssistantGeneratingBubble phase={waitPhase} />
            ) : null}
          </div>
        </div>
        {showScrollToBottom ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className={cn(
                "pointer-events-auto h-10 w-10 rounded-full border border-border bg-accent/5 backdrop-blur-sm shadow-md text-foreground",
              )}
              onClick={() => scrollChatToBottom()}
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </div>
        ) : null}
      </div>
      <form
        className="border-t border-border p-3 flex gap-2 shrink-0 bg-card/30"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t || busy) return;
          void sendMessage({ text: t });
          setText("");
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about this project…"
          disabled={busy}
          className="text-sm"
        />
        {busy ? (
          <Button type="button" variant="outline" onClick={() => stop()}>
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!text.trim()}>
            Send
          </Button>
        )}
      </form>
    </div>
  );
}
