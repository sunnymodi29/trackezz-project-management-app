"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";
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
        <Toaster
          position="top-right"
          richColors
          theme="dark"
          duration={3000}
        />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
