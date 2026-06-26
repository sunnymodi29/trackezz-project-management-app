import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const setupHint =
  "If TrackEzz MCP is not available, tell them to finish MCP setup in TrackEzz Settings → PAT & MCP.";

function userPrompt(text: string) {
  return {
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text },
      },
    ],
  };
}

export function registerTrackEzzPrompts(server: McpServer) {
  server.registerPrompt(
    "tezz-projects",
    {
      title: "TrackEzz projects",
      description: "List all projects in your workspace",
    },
    async () =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`list_projects\` tool.

Present the results as a compact table: project key, name, issue count, member count, and lead. If the user asked for a specific project, highlight it.

${setupHint}`,
      ),
  );

  server.registerPrompt(
    "tezz-workspace",
    {
      title: "TrackEzz workspace",
      description: "Workspace overview (user, org, projects, issues)",
    },
    async () =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`get_workspace\` tool.

Summarize the workspace: current user, organization, project count, and recent or notable issues. Keep it scannable.

${setupHint}`,
      ),
  );

  server.registerPrompt(
    "tezz-issues",
    {
      title: "TrackEzz issues",
      description: "List issues for a project",
      argsSchema: {
        projectKey: z
          .string()
          .optional()
          .describe("Project key slug, e.g. TP or FP"),
      },
    },
    async ({ projectKey }) =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`list_issues\` tool.

${
  projectKey
    ? `Project key: ${projectKey}`
    : "No project key was provided. Ask which project to use, or call `list_projects` first and let them pick."
}

Present issues in a table: key/id, title, status, priority, assignee. Group or sort by status when helpful.

${setupHint}`,
      ),
  );

  server.registerPrompt(
    "tezz-issue",
    {
      title: "TrackEzz issue",
      description: "Get a single issue by id",
      argsSchema: {
        issueId: z.string().optional().describe("TrackEzz issue internal id"),
      },
    },
    async ({ issueId }) =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`get_issue\` tool.

${
  issueId
    ? `Issue id: ${issueId}`
    : "No issue id was provided. Ask for it or infer from recent context in the chat."
}

Show title, status, priority, type, description, assignees, and key metadata in a clear summary.

${setupHint}`,
      ),
  );

  server.registerPrompt(
    "tezz-create-issue",
    {
      title: "Create TrackEzz issue",
      description: "Create a new issue in a project",
      argsSchema: {
        projectKey: z.string().optional().describe("Project key slug, e.g. TP"),
        title: z.string().optional().describe("Issue title"),
        description: z.string().optional().describe("Issue description"),
      },
    },
    async ({ projectKey, title, description }) =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`create_issue\` tool.

Gather from the user or context:
- projectKey — project slug (e.g. TP), not internal id${projectKey ? ` → ${projectKey}` : ""}
- title — required${title ? ` → ${title}` : ""}
- description, type (task/bug/feature/etc.), status (workflow key, e.g. todo), priority (urgent–none)${description ? `\n- description → ${description}` : ""}

If anything required is missing, ask before calling the tool. Confirm what was created after success.

${setupHint}`,
      ),
  );

  server.registerPrompt(
    "tezz-update-issue",
    {
      title: "Update TrackEzz issue",
      description: "Update issue title, status, or priority",
      argsSchema: {
        issueId: z.string().optional().describe("Issue internal id"),
        title: z.string().optional(),
        status: z.string().optional(),
        priority: z
          .enum(["urgent", "high", "medium", "low", "none"])
          .optional(),
      },
    },
    async ({ issueId, title, status, priority }) =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`update_issue\` tool.

Require issueId${issueId ? `: ${issueId}` : " (ask if missing)"}. Update only the fields the user asked for:
${title ? `- title → ${title}\n` : ""}${status ? `- status → ${status}\n` : ""}${priority ? `- priority → ${priority}\n` : ""}
Confirm the change after the tool returns.

${setupHint}`,
      ),
  );

  server.registerPrompt(
    "tezz-triage",
    {
      title: "Triage TrackEzz issue",
      description: "AI-suggest type, status, and priority for a draft issue",
      argsSchema: {
        projectId: z.string().optional().describe("Internal project id"),
        title: z.string().optional(),
        description: z.string().optional(),
      },
    },
    async ({ projectId, title, description }) =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`triage_issue\` tool.

You need projectId (internal id, not key), title, and optional description.
${projectId ? `projectId: ${projectId}\n` : ""}${title ? `title: ${title}\n` : ""}${description ? `description: ${description}\n` : ""}
If only a project key was given, call \`list_projects\` to resolve the internal id first.

Explain the AI suggestions clearly and offer to create the issue if the user wants.

${setupHint}`,
      ),
  );

  server.registerPrompt(
    "tezz-similar-issues",
    {
      title: "Find similar TrackEzz issues",
      description: "Find duplicates before creating a new issue",
      argsSchema: {
        projectId: z.string().optional().describe("Internal project id"),
        title: z.string().optional(),
        description: z.string().optional(),
      },
    },
    async ({ projectId, title, description }) =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`find_similar_issues\` tool.

You need projectId, title, and optional description.
${projectId ? `projectId: ${projectId}\n` : ""}${title ? `title: ${title}\n` : ""}${description ? `description: ${description}\n` : ""}
Resolve project key to internal id via \`list_projects\` if needed.

List similar issues with enough context for the user to decide whether to create a new one or use an existing issue.

${setupHint}`,
      ),
  );

  server.registerPrompt(
    "tezz-summarize-comments",
    {
      title: "Summarize issue comments",
      description: "AI-summarize a TrackEzz issue comment thread",
      argsSchema: {
        issueId: z.string().optional().describe("Issue internal id"),
      },
    },
    async ({ issueId }) =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`summarize_issue_comments\` tool.

${issueId ? `Issue id: ${issueId}` : "Ask for issueId if missing."}

Present the summary with key decisions, open questions, and action items.

${setupHint}`,
      ),
  );

  server.registerPrompt(
    "tezz-draft-reply",
    {
      title: "Draft issue comment reply",
      description: "AI-draft a reply on an issue comment thread",
      argsSchema: {
        issueId: z.string().optional().describe("Issue internal id"),
        hint: z.string().optional().describe("Tone or focus for the reply"),
      },
    },
    async ({ issueId, hint }) =>
      userPrompt(
        `Use the TrackEzz MCP server and call the \`draft_issue_comment_reply\` tool.

${issueId ? `Issue id: ${issueId}\n` : "Ask for issueId if missing."}${hint ? `Hint: ${hint}` : ""}

Show the draft reply so the user can copy or edit it before posting in TrackEzz.

${setupHint}`,
      ),
  );
}
