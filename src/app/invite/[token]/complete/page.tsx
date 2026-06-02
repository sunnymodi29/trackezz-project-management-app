import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL — cookie writes run in the join Route Handler. */
export default async function InviteCompletePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/invite/${token}/join`);
}
