import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  requireSessionUser,
  withRateLimit,
} from "@/lib/api/auth";
import {
  generatePatPlaintext,
  hashPat,
  patDisplayPrefix,
} from "@/lib/auth/pat";
import { handleApiError, jsonOk } from "@/lib/api/response";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    await withRateLimit(user.id!, "tokens:list");

    const tokens = await prisma.personalAccessToken.findMany({
      where: { userId: user.id! },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return jsonOk(tokens);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    await withRateLimit(user.id!, "tokens:create");

    const body = createSchema.parse(await request.json());
    const plaintext = generatePatPlaintext();

    const record = await prisma.personalAccessToken.create({
      data: {
        userId: user.id!,
        name: body.name,
        tokenHash: hashPat(plaintext),
        tokenPrefix: patDisplayPrefix(plaintext),
      },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return jsonOk({ token: plaintext, record }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
