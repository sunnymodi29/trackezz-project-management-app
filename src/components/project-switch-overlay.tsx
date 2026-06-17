"use client";

import { Zap } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

export function ProjectSwitchOverlay() {
  const { projectSwitch, sidebarCollapsed } = useAppStore();
  const { active, project } = projectSwitch;

  if (!active || !project) return null;

  const accent = project.color || "oklch(0.60 0.23 280)";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`Switching to ${project.name}`}
      className={cn(
        "fixed z-10000 flex items-center justify-center",
        "bg-background/55 backdrop-blur-md",
        "animate-in fade-in duration-200",
        "right-0 top-0 bottom-0",
        sidebarCollapsed ? "left-14" : "left-60",
      )}
    >
      {/* Top accent progress */}
      <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden bg-border/40">
        <div
          className="h-full w-1/2 rounded-full animate-project-switch-progress"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, var(--color-primary), transparent)`,
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-6 px-8 max-w-sm text-center animate-scale-in">
        {/* Project badge + TrackEzz orbit */}
        <div className="relative">
          <div
            className="absolute -inset-3 rounded-3xl opacity-35 blur-2xl animate-pulse"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <div
            className="absolute inset-0 m-auto h-[88px] w-[88px] rounded-full border border-dashed border-primary/25 animate-project-switch-orbit"
            aria-hidden
          />
          <div
            className="relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl font-bold text-2xl text-white shadow-xl ring-1 ring-white/10"
            style={{
              backgroundColor: accent,
              backgroundImage: `linear-gradient(135deg, ${accent}, ${accent}99)`,
            }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div
            className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg ring-2 ring-background"
            aria-hidden
          >
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            Switching project
          </p>
          <p className="text-lg font-bold text-foreground leading-tight">
            {project.name}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {project.key}
          </p>
        </div>

        <div className="flex items-center gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
