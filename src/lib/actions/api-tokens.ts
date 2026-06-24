"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import {
  generatePatPlaintext,
  hashPat,
  patDisplayPrefix,
} from "@/lib/auth/pat";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
});

export type ApiTokenListItem = {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function listApiTokens(): Promise<ApiTokenListItem[]> {
  const userId = await requireUserId();
  const rows = await prisma.personalAccessToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  return rows;
}

export async function createApiToken(input: {
  name: string;
}): Promise<{ token: string; record: ApiTokenListItem }> {
  const userId = await requireUserId();
  const { name } = createSchema.parse(input);

  const plaintext = generatePatPlaintext();
  const record = await prisma.personalAccessToken.create({
    data: {
      userId,
      name,
      tokenHash: hashPat(plaintext),
      tokenPrefix: patDisplayPrefix(plaintext),
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return { token: plaintext, record };
}

export async function updateApiToken(input: {
  id: string;
  name: string;
}): Promise<ApiTokenListItem> {
  const userId = await requireUserId();
  const { id, name } = updateSchema.parse(input);

  const row = await prisma.personalAccessToken.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!row) {
    throw new Error("NOT_FOUND: Token not found");
  }

  return prisma.personalAccessToken.update({
    where: { id },
    data: { name },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

export async function revokeApiToken(tokenId: string): Promise<void> {
  const userId = await requireUserId();
  const row = await prisma.personalAccessToken.findFirst({
    where: { id: tokenId, userId },
    select: { id: true },
  });
  if (!row) {
    throw new Error("NOT_FOUND: Token not found");
  }
  await prisma.personalAccessToken.delete({ where: { id: tokenId } });
}
