# TrackEzz

**Build Faster. Track Smarter. Ship Better.**

Enterprise-grade project management and bug tracking — inspired by Linear, ClickUp, Jira, and YouTrack — with AI-powered productivity features.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, Radix UI |
| Database | PostgreSQL (Neon) + Prisma ORM 7 |
| Auth | Auth.js (NextAuth v5), Argon2, Google OAuth |
| Cache / queues | Upstash Redis |
| State | Zustand (client UI), Server Components (data) |

## Architecture

```
User → Organization (company) → Team Workspaces → Projects → Issues
```

- **Sign up:** Each user gets their own **organization** and a default **General** team workspace (isolated from other signups).
- **Teams:** Organization owners/admins can create additional team workspaces (Engineering, Marketing, etc.).
- **Invites:** Workspace owners/admins invite colleagues by email via **Brevo**; accept at `/invite/[token]`.
- **Assignees:** Issue assignees are limited to members of the **active team workspace**.

**Workspace roles:** Owner, Admin, Member, Viewer  
**Project roles:** Project Admin, Developer, QA, Reporter, Viewer

## Quick start

### 1. Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL) or a [Neon](https://neon.tech) database

### 2. Install

```bash
npm install
cp .env.example .env
```

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `EMAIL`, and `SMTP_PASS` for invitation emails (Brevo **SMTP** credentials from [SMTP & API](https://app.brevo.com/settings/keys/smtp)). `SMTP_USER` is your Brevo login email; `SMTP_PASS` is the SMTP key; `EMAIL` is a [verified sender](https://app.brevo.com/senders).

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 3. Database (PostgreSQL)

Set `DATABASE_URL` in `.env` (see `.env.example`).

**Local PostgreSQL (Docker):**

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
```

**Neon (production / Vercel):** Create a project, copy the connection string into `DATABASE_URL` (add `?sslmode=require` if needed), then:

```bash
npm run db:migrate
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in:

| Email | Password |
|-------|----------|
| `alex@trackezz.com` | `password123` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Reset DB + re-seed |
| `npm run db:studio` | Prisma Studio |

## REST API (v1)

Routes accept either a **browser session cookie** (after sign-in) or a **Personal Access Token**:

```bash
Authorization: Bearer tezz_pat_...
```

Create tokens in the app: **Settings → API & MCP**.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/bootstrap` | Workspace dashboard payload |
| `GET` | `/api/v1/projects` | List projects |
| `GET` | `/api/v1/projects/:id/issues` | List project issues |
| `POST` | `/api/v1/projects/:id/issues` | Create issue |
| `GET` | `/api/v1/issues/:id` | Get issue |
| `PATCH` | `/api/v1/issues/:id` | Update issue |
| `GET` | `/api/v1/tokens` | List your PATs (session only) |
| `POST` | `/api/v1/tokens` | Create PAT (session only) |
| `DELETE` | `/api/v1/tokens/:id` | Revoke PAT (session only) |

AI routes (`/api/ai/*`) also accept PAT auth for triage, similar issues, and comment tools.

Example:

```bash
curl http://localhost:3000/api/v1/bootstrap \
  -H "Authorization: Bearer tezz_pat_..."
```

## MCP (Cursor / Claude Desktop)

TrackEzz ships an MCP server that calls the HTTP API using a PAT.

### Commands to run (once)

From the **repo root**:

```bash
npm run db:migrate
npx prisma generate
```

From **`packages/trackezz-mcp`**:

```bash
npm install
npm run build
```

Or from root after installing MCP deps: `npm run mcp:build`

### Publish to npm

The root app is `"private": true` and must **not** be published. Publish only the MCP package (after creating the **`trackezz`** org on [npmjs.com/org/create](https://www.npmjs.com/org/create)):

```bash
npm run mcp:publish
```

### Cursor config

Create a token in **Settings → API & MCP**, then add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "trackezz": {
      "command": "node",
      "args": ["C:/path/to/taskforge-ai/packages/trackezz-mcp/dist/index.js"],
      "env": {
        "TRACKEZZ_API_URL": "https://trackezz-webapp.vercel.app/",
        "TRACKEZZ_API_TOKEN": "tezz_pat_your_token_here"
      }
    }
  }
}
```

See [packages/trackezz-mcp/README.md](packages/trackezz-mcp/README.md) for the full tool list.


## Project structure

```
src/
  app/              # Routes (App Router)
  components/       # UI components
  lib/
    actions/        # Server actions
    api/            # API helpers
    auth/           # Password, RBAC
    queries/        # Data access
  store/            # Zustand client state
  types/            # TypeScript types
prisma/
  schema.prisma     # Database schema
  seed.ts           # Demo data
```

## Troubleshooting (development)

### React hydration warning: `bis_skin_checked` (or similar extra attributes)

If the console shows a hydration mismatch and the diff lists attributes like **`bis_skin_checked`**, a **browser extension** (often a password manager or security tool) is mutating the DOM before React hydrates. That is not produced by TrackEzz and cannot be fully suppressed from app code.

**What to do:** turn off extensions for `localhost` (or use a private/incognito window with extensions disabled), or ignore the warning in local dev. The root layout already sets `suppressHydrationWarning` on `<html>` and `<body>` for legitimate cases (for example theme).

## Security

- Argon2 password hashing
- Database sessions (Auth.js + Prisma adapter)
- RBAC on server actions and API routes
- Upstash rate limiting on `/api/v1/*` (when Redis is configured)
- Personal access tokens (SHA-256 hashed) for API & MCP integrations
- Zod validation on API inputs

## Deployment (Vercel + Neon)

1. Push to GitHub (do not commit `.env`, `node_modules`, `.next`, or `public/uploads`).
2. Create a [Neon](https://neon.tech) database and copy `DATABASE_URL` (use `?sslmode=require` if required).
3. Import the repo in [Vercel](https://vercel.com) — `vercel.json` runs `prisma migrate deploy` on build.
4. In Vercel **Environment Variables**, set at minimum:
   - `DATABASE_URL` — Neon connection string
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — `https://your-app.vercel.app`
   - `NEXT_PUBLIC_APP_URL` — same as `AUTH_URL`
   - `SMTP_*` and `EMAIL` — Brevo invitation emails
5. Deploy. Optionally seed production once: `npm run db:seed` (with `DATABASE_URL` pointing at Neon).

**AI (optional):** set `GROQ_API_KEY` for LLM features (project assistant, triage, comment tools). Set `OPENAI_API_KEY` for semantic similar-issue search from embeddings; without it, similar search uses lexical overlap only.

**Note:** Avatar and comment file uploads use local disk in development. On Vercel they are disabled until you add object storage (e.g. Vercel Blob).

## Roadmap (from spec)

- [x] Foundation — Prisma, PostgreSQL, seed data
- [x] Auth — credentials, Google OAuth, RBAC, REST API
- [ ] Collaboration — Pusher realtime, Resend emails
- [x] AI — Vercel AI SDK + Groq (assistant, triage, comments); optional OpenAI embeddings for similar issues
- [ ] SaaS — Stripe subscriptions, audit exports
- [ ] Tests — Playwright + Vitest

## License

Private — TrackEzz
