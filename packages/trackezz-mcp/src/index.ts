#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TrackEzzClient, jsonText } from "./client.js";
import { registerTrackEzzPrompts } from "./prompts.js";

const issueTypeSchema = z.enum([
  "task",
  "bug",
  "feature",
  "improvement",
  "epic",
  "story",
]);

const prioritySchema = z.enum(["urgent", "high", "medium", "low", "none"]);

const listIssuesSchema = z.object({
  projectKey: z.string().min(1).describe("Project key, e.g. TE"),
});

const getIssueSchema = z.object({
  issueId: z.string().min(1),
});

const createIssueSchema = z.object({
  projectKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: issueTypeSchema.default("task"),
  status: z.string().min(1).describe("Workflow status key, e.g. todo"),
  priority: prioritySchema.default("medium"),
  assigneeIds: z.array(z.string()).optional(),
});

const updateIssueSchema = z.object({
  issueId: z.string().min(1),
  title: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  priority: prioritySchema.optional(),
});

const triageSchema = z.object({
  projectId: z.string().min(1).describe("Internal project id"),
  title: z.string().min(1),
  description: z.string().optional(),
});

const similarIssuesSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  excludeIssueId: z.string().optional(),
});

const summarizeCommentsSchema = z.object({
  issueId: z.string().min(1),
});

const draftReplySchema = z.object({
  issueId: z.string().min(1),
  hint: z.string().optional().describe("Optional tone or focus for the reply"),
});

export function createTrackEzzMcpServer(client: TrackEzzClient) {
  const server = new McpServer({
    name: "trackezz",
    version: "0.1.1",
  });

  server.registerTool(
    "list_projects",
    {
      description: "List all projects in the current workspace",
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        { type: "text", text: jsonText(await client.get("/api/v1/projects")) },
      ],
    }),
  );

  server.registerTool(
    "get_workspace",
    {
      description:
        "Get workspace bootstrap data (user, org, projects summary, issues)",
      inputSchema: z.object({}),
    },
    async () => ({
      content: [
        { type: "text", text: jsonText(await client.get("/api/v1/bootstrap")) },
      ],
    }),
  );

  server.registerTool(
    "list_issues",
    {
      description:
        "List issues for a project. projectKey is the project key slug (e.g. TE), not the internal id.",
      inputSchema: listIssuesSchema,
    },
    async ({ projectKey }: z.infer<typeof listIssuesSchema>) => ({
      content: [
        {
          type: "text",
          text: jsonText(
            await client.get(
              `/api/v1/projects/${encodeURIComponent(projectKey)}/issues`,
            ),
          ),
        },
      ],
    }),
  );

  server.registerTool(
    "get_issue",
    {
      description: "Get a single issue by its internal id",
      inputSchema: getIssueSchema,
    },
    async ({ issueId }: z.infer<typeof getIssueSchema>) => ({
      content: [
        {
          type: "text",
          text: jsonText(
            await client.get(`/api/v1/issues/${encodeURIComponent(issueId)}`),
          ),
        },
      ],
    }),
  );

  server.registerTool(
    "create_issue",
    {
      description: "Create a new issue in a project",
      inputSchema: createIssueSchema,
    },
    async (input: z.infer<typeof createIssueSchema>) => ({
      content: [
        {
          type: "text",
          text: jsonText(
            await client.post(
              `/api/v1/projects/${encodeURIComponent(input.projectKey)}/issues`,
              {
                title: input.title,
                description: input.description,
                type: input.type,
                status: input.status,
                priority: input.priority,
                assigneeIds: input.assigneeIds,
              },
            ),
          ),
        },
      ],
    }),
  );

  server.registerTool(
    "update_issue",
    {
      description: "Update an issue title, status, or priority",
      inputSchema: updateIssueSchema,
    },
    async ({ issueId, ...patch }: z.infer<typeof updateIssueSchema>) => ({
      content: [
        {
          type: "text",
          text: jsonText(
            await client.patch(
              `/api/v1/issues/${encodeURIComponent(issueId)}`,
              patch,
            ),
          ),
        },
      ],
    }),
  );

  server.registerTool(
    "triage_issue",
    {
      description:
        "AI-suggest issue type, workflow status, and priority for a draft issue",
      inputSchema: triageSchema,
    },
    async (input: z.infer<typeof triageSchema>) => ({
      content: [
        {
          type: "text",
          text: jsonText(await client.post("/api/ai/triage", input)),
        },
      ],
    }),
  );

  server.registerTool(
    "find_similar_issues",
    {
      description: "Find similar existing issues before creating a duplicate",
      inputSchema: similarIssuesSchema,
    },
    async (input: z.infer<typeof similarIssuesSchema>) => ({
      content: [
        {
          type: "text",
          text: jsonText(await client.post("/api/ai/similar-issues", input)),
        },
      ],
    }),
  );

  server.registerTool(
    "summarize_issue_comments",
    {
      description: "AI-summarize an issue comment thread",
      inputSchema: summarizeCommentsSchema,
    },
    async ({ issueId }: z.infer<typeof summarizeCommentsSchema>) => ({
      content: [
        {
          type: "text",
          text: jsonText(
            await client.post("/api/ai/issue-comments", {
              issueId,
              mode: "summarize",
            }),
          ),
        },
      ],
    }),
  );

  server.registerTool(
    "draft_issue_comment_reply",
    {
      description: "AI-draft a reply for an issue comment thread",
      inputSchema: draftReplySchema,
    },
    async ({ issueId, hint }: z.infer<typeof draftReplySchema>) => ({
      content: [
        {
          type: "text",
          text: jsonText(
            await client.post("/api/ai/issue-comments", {
              issueId,
              mode: "draft_reply",
              hint,
            }),
          ),
        },
      ],
    }),
  );

  registerTrackEzzPrompts(server);

  return server;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export async function runStdioMcpServer(client: TrackEzzClient) {
  const server = createTrackEzzMcpServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TrackEzz MCP server running on stdio");
}

async function main() {
  const baseUrl = requireEnv("TRACKEZZ_API_URL");
  const token = requireEnv("TRACKEZZ_API_TOKEN");
  const client = new TrackEzzClient(baseUrl, token);
  await runStdioMcpServer(client);
}

main().catch((err) => {
  console.error("TrackEzz MCP failed to start:", err);
  process.exit(1);
});
