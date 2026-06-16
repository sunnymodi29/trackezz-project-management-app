"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { DocumentTitle } from "@/components/document-title";
import { RouteTransitionSync } from "@/components/route-transition-sync";
import { RouteTransitionLoader } from "@/components/route-transition-loader";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <DocumentTitle />
        <RouteTransitionSync />
        <RouteTransitionLoader />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
