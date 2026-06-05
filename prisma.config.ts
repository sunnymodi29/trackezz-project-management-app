// Prisma CLI (migrate, db pull, studio) uses datasource.url — not DATABASE_URL at runtime.
// Neon/Vercel: set DIRECT_URL to the non-pooler host (no "-pooler" in hostname).
// App runtime still uses DATABASE_URL (pooled) via src/lib/db.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

function cliDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  const fallback = process.env.DATABASE_URL?.trim();
  return direct || fallback || "";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: cliDatabaseUrl(),
  },
});
