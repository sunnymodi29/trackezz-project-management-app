"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Key,
  Copy,
  Check,
  Trash2,
  Plus,
  Braces,
  X,
  Pencil,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Skeleton,
  Tooltip,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  updateApiToken,
  type ApiTokenListItem,
} from "@/lib/actions/api-tokens";

const MCP_PACKAGE = "@trackezz/mcp@0.1.0";

const MCP_CLIENTS = [
  {
    id: "cursor",
    name: "Cursor",
    configFile: ".cursor/mcp.json",
    location: "Project root, or ~/.cursor/mcp.json for all workspaces.",
    restart: "Restart Cursor or reload the window.",
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    configFile: "claude_desktop_config.json",
    location:
      "macOS: ~/Library/Application Support/Claude/ · Windows: %APPDATA%\\Claude\\ · Linux: ~/.config/Claude/",
    restart: "Quit and reopen Claude Desktop.",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    configFile: "mcp_config.json",
    location: "~/.codeium/windsurf/mcp_config.json",
    restart: "Restart Windsurf.",
  },
  {
    id: "vscode",
    name: "VS Code",
    configFile: ".vscode/mcp.json",
    location:
      "Workspace .vscode/mcp.json or user settings with an MCP-compatible extension (e.g. GitHub Copilot).",
    restart: "Reload the VS Code window.",
  },
  {
    id: "trae",
    name: "Trae",
    configFile: ".trae/mcp.json",
    location: "Project root .trae/mcp.json",
    restart: "Restart Trae.",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    configFile: "settings.json",
    location: "~/.gemini/settings.json (merge into mcpServers)",
    restart: "Restart the Gemini CLI session.",
  },
] as const;

type McpClientId = (typeof MCP_CLIENTS)[number]["id"];

function buildMcpConfigJson(apiUrl: string, token: string) {
  return JSON.stringify(
    {
      mcpServers: {
        trackezz: {
          command: "npx",
          args: ["-y", MCP_PACKAGE],
          env: {
            TRACKEZZ_API_URL: apiUrl || "https://your-app.example.com",
            TRACKEZZ_API_TOKEN: token,
          },
        },
      },
    },
    null,
    2,
  );
}

function formatExpires(date: Date | null) {
  if (!date) return "Never";
  if (date.getTime() < Date.now()) return "Expired";
  return date.toLocaleDateString();
}

function formatUsed(date: Date | null) {
  if (!date) return "Never";
  return formatRelativeTime(date);
}

export function ApiTokensSettings() {
  const [tokens, setTokens] = useState<ApiTokenListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [apiUrl, setApiUrl] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdRecordId, setCreatedRecordId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);
  const [mcpConfigCopied, setMcpConfigCopied] = useState(false);

  const [editToken, setEditToken] = useState<ApiTokenListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const createMcpConfigJson = useMemo(
    () =>
      createdToken
        ? buildMcpConfigJson(apiUrl, createdToken)
        : buildMcpConfigJson(apiUrl, "tezz_pat_your_token_here"),
    [apiUrl, createdToken],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTokens(await listApiTokens());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PATs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setApiUrl(window.location.origin);
  }, []);

  const resetCreateModal = () => {
    setCreateOpen(false);
    setCreatedToken(null);
    setCreatedRecordId(null);
    setCreateName("");
    setTokenCopied(false);
    setMcpConfigCopied(false);
  };

  const handleCreateNewToken = async () => {
    setCreating(true);
    setError(null);
    try {
      const { token, record } = await createApiToken({ name: "New PAT" });
      setCreatedToken(token);
      setCreatedRecordId(record.id);
      setCreateName(record.name);
      setTokens((prev) => [record, ...prev.filter((t) => t.id !== record.id)]);
      setCreateOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create PAT");
    } finally {
      setCreating(false);
    }
  };

  const handleCloseCreateModal = async () => {
    if (createdRecordId && createName.trim()) {
      try {
        const updated = await updateApiToken({
          id: createdRecordId,
          name: createName.trim(),
        });
        setTokens((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save PAT name");
      }
    }
    resetCreateModal();
  };

  const handleCopyToken = async () => {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleCopyMcpConfig = async () => {
    await navigator.clipboard.writeText(createMcpConfigJson);
    setMcpConfigCopied(true);
    setTimeout(() => setMcpConfigCopied(false), 2000);
  };

  const openEditModal = (token: ApiTokenListItem) => {
    setEditToken(token);
    setEditName(token.name);
    setEditError(null);
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditToken(null);
    setEditName("");
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editToken || !editName.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateApiToken({
        id: editToken.id,
        name: editName.trim(),
      });
      setTokens((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditToken(null);
      setEditName("");
      setEditError(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update PAT");
    } finally {
      setEditSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    setRevoking(true);
    try {
      await revokeApiToken(revokeId);
      setTokens((prev) => prev.filter((t) => t.id !== revokeId));
      setRevokeId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke PAT");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Personal access tokens & MCP
            </CardTitle>
            <Button
              className="gap-1.5 shrink-0"
              disabled={creating}
              onClick={() => void handleCreateNewToken()}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {creating ? "Creating…" : "Create PAT"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Personal access tokens (PATs) connect TrackEzz to MCP-compatible
              tools — Cursor, Claude Desktop, Windsurf, VS Code, and more.
              Create a PAT to get install steps and{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {MCP_PACKAGE}
              </code>
              .
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active PATs</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {loading ? (
              <div className="">
                <ActiveTokensTableSkeleton />
              </div>
            ) : tokens.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 pb-5">
                No PATs yet. Create one to connect MCP.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-3 py-3 font-medium">PAT</th>
                      <th className="px-3 py-3 font-medium hidden sm:table-cell">
                        Expires
                      </th>
                      <th className="px-3 py-3 font-medium hidden md:table-cell">
                        Created
                      </th>
                      <th className="px-3 py-3 font-medium hidden lg:table-cell">
                        Used
                      </th>
                      <th className="px-5 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tokens.map((token) => (
                      <tr key={token.id} className="hover:bg-muted/30">
                        <td className="px-5 py-3 font-medium">{token.name}</td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                          {token.tokenPrefix}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">
                          {formatExpires(token.expiresAt)}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">
                          {formatRelativeTime(token.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground hidden lg:table-cell">
                          {formatUsed(token.lastUsedAt)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip content="Edit PAT">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                title="Edit PAT"
                                onClick={() => openEditModal(token)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Delete PAT">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete PAT"
                                onClick={() => setRevokeId(token.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateTokenModal
        open={createOpen && createdToken != null}
        name={createName}
        token={createdToken ?? ""}
        mcpConfigJson={createMcpConfigJson}
        tokenCopied={tokenCopied}
        mcpConfigCopied={mcpConfigCopied}
        onNameChange={setCreateName}
        onCopyToken={() => void handleCopyToken()}
        onCopyMcpConfig={() => void handleCopyMcpConfig()}
        onClose={() => void handleCloseCreateModal()}
      />

      <EditTokenModal
        open={editToken != null}
        name={editName}
        tokenPrefix={editToken?.tokenPrefix ?? ""}
        saving={editSaving}
        error={editError}
        onNameChange={setEditName}
        onClose={closeEditModal}
        onSave={() => void handleSaveEdit()}
      />

      <ConfirmDialog
        open={revokeId != null}
        title="Revoke PAT?"
        description="Any MCP client using this PAT will lose access immediately."
        confirmLabel="Delete"
        variant="destructive"
        loading={revoking}
        onConfirm={() => void handleRevoke()}
        onClose={() => setRevokeId(null)}
      />
    </>
  );
}

function CreateTokenModal({
  open,
  name,
  token,
  mcpConfigJson,
  tokenCopied,
  mcpConfigCopied,
  onNameChange,
  onCopyToken,
  onCopyMcpConfig,
  onClose,
}: {
  open: boolean;
  name: string;
  token: string;
  mcpConfigJson: string;
  tokenCopied: boolean;
  mcpConfigCopied: boolean;
  onNameChange: (value: string) => void;
  onCopyToken: () => void;
  onCopyMcpConfig: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-token-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative flex w-full max-w-2xl max-h-[90vh] flex-col rounded-xl border border-border bg-card shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 id="create-token-title" className="text-sm font-bold">
            New personal access token
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-xs font-semibold text-red-600">
            Copy this PAT now — it won&apos;t be shown again.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              PAT Name
            </label>
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Cursor MCP"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              PAT Value
            </label>
            <div className="flex items-center gap-2">
              <Input value={token} readOnly className="font-mono text-xs" />
              <Button
                size="sm"
                variant="default"
                className="shrink-0 gap-1"
                onClick={onCopyToken}
              >
                {tokenCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {tokenCopied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <McpSetupPanel
            mcpConfigJson={mcpConfigJson}
            copied={mcpConfigCopied}
            onCopy={() => onCopyMcpConfig()}
          />
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-border bg-card px-5 py-4 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function McpSetupPanel({
  mcpConfigJson,
  copied,
  onCopy,
}: {
  mcpConfigJson: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const [clientId, setClientId] = useState<McpClientId>("cursor");
  const client = MCP_CLIENTS.find((c) => c.id === clientId) ?? MCP_CLIENTS[0];

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Braces className="h-3.5 w-3.5" />
        MCP setup
      </label>

      <p className="text-xs text-muted-foreground">
        Same server block works across MCP-compatible IDEs and AI tools. Pick
        yours for where to save the file.
      </p>

      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border flex-wrap">
        {MCP_CLIENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setClientId(item.id)}
            className={cn(
              "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
              clientId === item.id
                ? "bg-accent text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-xs">
        <div>
          <span className="font-medium text-foreground">Config file: </span>
          <code className="text-muted-foreground">{client.configFile}</code>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {client.location}
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Then: </span>
          {client.restart}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/60 px-3 py-2">
          <span className="text-[11px] font-mono text-muted-foreground">
            mcp.json
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-7 text-xs"
            onClick={onCopy}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy JSON"}
          </Button>
        </div>
        <pre className="overflow-x-auto p-3 text-[11px] font-mono leading-relaxed">
          {mcpConfigJson}
        </pre>
      </div>
    </div>
  );
}

function EditTokenModal({
  open,
  name,
  tokenPrefix,
  saving,
  error,
  onNameChange,
  onClose,
  onSave,
}: {
  open: boolean;
  name: string;
  tokenPrefix: string;
  saving: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, saving, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-token-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />
      <form
        className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id="edit-token-title" className="text-sm font-bold">
            Edit personal access token
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1 rounded hover:bg-muted disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              PAT name
            </label>
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              PAT Prefix
            </label>
            <Input
              value={tokenPrefix}
              readOnly
              disabled
              className="font-mono text-xs text-muted-foreground"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function ActiveTokensTableSkeleton() {
  return (
    <table className="w-full text-sm" aria-hidden>
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted-foreground">
          <th className="px-5 py-3 font-medium">Name</th>
          <th className="px-3 py-3 font-medium">PAT</th>
          <th className="px-3 py-3 font-medium hidden sm:table-cell">Expires</th>
          <th className="px-3 py-3 font-medium hidden md:table-cell">Created</th>
          <th className="px-3 py-3 font-medium hidden lg:table-cell">Used</th>
          <th className="px-5 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {Array.from({ length: 3 }).map((_, index) => (
          <tr key={index}>
            <td className="px-5 py-3">
              <Skeleton className="h-4 w-28" />
            </td>
            <td className="px-3 py-3">
              <Skeleton className="h-3.5 w-36 font-mono" />
            </td>
            <td className="px-3 py-3 hidden sm:table-cell">
              <Skeleton className="h-3.5 w-16" />
            </td>
            <td className="px-3 py-3 hidden md:table-cell">
              <Skeleton className="h-3.5 w-20" />
            </td>
            <td className="px-3 py-3 hidden lg:table-cell">
              <Skeleton className="h-3.5 w-20" />
            </td>
            <td className="px-5 py-3">
              <div className="flex items-center justify-end gap-2">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
