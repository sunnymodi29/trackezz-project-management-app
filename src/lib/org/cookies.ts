export const ACTIVE_PROJECT_COOKIE = "tf_project";
export const ACTIVE_ORG_COOKIE = "tf_org";

export function projectCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 365) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function orgCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 365) {
  return projectCookieOptions(maxAgeSeconds);
}

/** Same attributes as when the cookie was set, but `maxAge: 0` removes it reliably (delete alone can miss httpOnly + path). */
export function expireWorkspaceCookieOptions() {
  return {
    ...orgCookieOptions(),
    maxAge: 0,
  } as const;
}
