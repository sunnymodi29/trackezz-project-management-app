import { auth } from "@/auth";
import { verifyPat } from "@/lib/auth/pat";
import { rateLimit } from "@/lib/rate-limit";

export type ApiUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

function bearerTokenFromRequest(request?: Request): string | null {
  if (!request) return null;
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function requireApiUser(request?: Request): Promise<ApiUser> {
  const bearer = bearerTokenFromRequest(request);
  if (bearer) {
    const patUser = await verifyPat(bearer);
    if (patUser) {
      return {
        id: patUser.id,
        email: patUser.email,
        name: patUser.name,
      };
    }
    throw new Error("Unauthorized");
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/** Session-only auth (e.g. creating or revoking PATs). */
export async function requireSessionUser(): Promise<ApiUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function withRateLimit(userId: string, route: string) {
  const { success } = await rateLimit(`${userId}:${route}`, {
    name: "api",
    requests: 120,
    window: "1 m",
  });
  if (!success) {
    throw new Error("FORBIDDEN: Rate limit exceeded");
  }
}
