"use client";

import { useEffect, useRef } from "react";
import {
  clearWorkspaceCookies,
  syncWorkspaceCookies,
} from "@/lib/actions/org";

/** Keeps tf_org / tf_project cookies aligned with server-side access (Server Actions only). */
export function WorkspaceCookieSync({ hasWorkspace }: { hasWorkspace: boolean }) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (hasWorkspace) {
      void syncWorkspaceCookies();
    } else {
      void clearWorkspaceCookies();
    }
  }, [hasWorkspace]);

  return null;
}
