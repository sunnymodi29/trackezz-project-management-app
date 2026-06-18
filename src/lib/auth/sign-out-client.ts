"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import { clearWorkspaceCookies } from "@/lib/actions/org";
import { useAppStore } from "@/store/app-store";

/** Sign out with the global full-screen route transition loader until login loads. */
export async function signOutWithLoader(callbackUrl = "/login") {
  const { beginRouteTransition, endRouteTransition } = useAppStore.getState();
  beginRouteTransition("/login", { fullScreen: true });

  try {
    await clearWorkspaceCookies();
    // `redirect: false` so this response’s Set-Cookie is applied before we hard-navigate; then full load clears client state.
    await nextAuthSignOut({ redirect: false, redirectTo: callbackUrl });
    window.location.assign(
      callbackUrl.startsWith("/")
        ? `${window.location.origin}${callbackUrl}`
        : callbackUrl,
    );
  } catch (error) {
    endRouteTransition();
    throw error;
  }
}
