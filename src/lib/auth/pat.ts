import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export const PAT_PREFIX = "tezz_pat_";

export function generatePatPlaintext(): string {
  return `${PAT_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashPat(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function patDisplayPrefix(token: string): string {
  return `${token.slice(0, 20)}…`;
}

export type PatAuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function verifyPat(token: string): Promise<PatAuthUser | null> {
  if (!token.startsWith(PAT_PREFIX)) return null;

  const tokenHash = hashPat(token);
  const row = await prisma.personalAccessToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;

  void prisma.personalAccessToken
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
  };
}
