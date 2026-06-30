"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function useIsDarkTheme(): boolean {
  const { resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  return isDark;
}
