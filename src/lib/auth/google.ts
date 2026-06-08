export function isGoogleAuthEnabled(): boolean {
  return !!(
    process.env.AUTH_GOOGLE_ID?.trim() &&
    process.env.AUTH_GOOGLE_SECRET?.trim()
  );
}

export function inviteJoinPath(token: string): string {
  return `/invite/${token}/join`;
}

/** Extract invite token from `/invite/{token}/join` callback paths. */
export function parseInviteTokenFromCallback(
  callbackUrl: string,
): string | null {
  const match = callbackUrl.match(/^\/invite\/([^/]+)\/join\/?$/);
  return match?.[1] ?? null;
}
