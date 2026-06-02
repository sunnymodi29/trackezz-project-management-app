/** True when `error` is a Next.js `redirect()` throw (not a real failure). */
export function isRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest =
    "digest" in error ? String((error as { digest: unknown }).digest) : "";
  return digest.includes("NEXT_REDIRECT");
}
