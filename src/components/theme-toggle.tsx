"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  size?: "sm" | "md";
};

const SIZES = {
  sm: { button: "h-8 w-8 rounded-md", icon: "h-4 w-4", box: "h-4 w-4" },
  md: { button: "h-9 w-9 rounded-lg", icon: "h-4 w-4", box: "h-4 w-4" },
} as const;

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const s = SIZES[size];

  const handleToggle = () => {
    setIsAnimating(true);
    setTheme(isDark ? "light" : "dark");
    window.setTimeout(() => setIsAnimating(false), 480);
  };

  if (!mounted) {
    return (
      <div
        className={cn("border border-border bg-muted/30", s.button, className)}
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-border text-muted-foreground",
        "transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        s.button,
        className,
      )}
    >
      <span className={cn("relative", s.box)} aria-hidden>
        <Sun
          className={cn(
            "absolute inset-0 text-amber-500 transition-all duration-[480ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            s.icon,
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-[120deg] scale-0 opacity-0",
            isAnimating && isDark && "theme-icon-pop",
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 text-indigo-400 transition-all duration-[480ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            s.icon,
            isDark
              ? "-rotate-[120deg] scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100",
            isAnimating && !isDark && "theme-icon-pop",
          )}
        />
      </span>
    </button>
  );
}
