import { NextResponse } from "next/server";
import { runInviteJoinFlow } from "@/lib/invitations/complete-invite-join";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const path = await runInviteJoinFlow(token);
  return NextResponse.redirect(new URL(path, request.url));
}
