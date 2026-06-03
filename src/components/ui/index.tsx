import * as React from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "secondary"
    | "link";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none";
    const variants = {
      default:
        "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20",
      outline:
        "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      link: "underline-offset-4 hover:underline text-primary p-0 h-auto",
    };
    const sizes = {
      sm: "h-8 px-3 text-xs rounded",
      md: "h-9 px-4 text-sm",
      lg: "h-10 px-6 text-sm",
      icon: "h-8 w-8 p-0",
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

// ── Badge ──────────────────────────────────────────────────────────────────
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "secondary";
}
export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-primary/10 text-primary border border-primary/20",
    outline: "border border-border text-muted-foreground",
    secondary: "bg-secondary text-secondary-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

// ── Input ──────────────────────────────────────────────────────────────────
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

// ── Textarea ───────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1 p-5 pb-0", className)}
      {...props}
    />
  );
}
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}
export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-4", className)} {...props} />;
}

// ── Separator ─────────────────────────────────────────────────────────────
export function Separator({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
interface AvatarProps {
  src?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}
export function Avatar({ src, name, size = "sm", className }: AvatarProps) {
  const sizes = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  };
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colors = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center font-semibold text-white overflow-hidden ring-2 ring-background",
        sizes[size],
        !src && color,
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

// ── AvatarGroup ────────────────────────────────────────────────────────────
interface AvatarGroupProps {
  users: { name: string; avatarUrl?: string }[];
  max?: number;
}
export function AvatarGroup({ users, max = 3 }: AvatarGroupProps) {
  const shown = users.slice(0, max);
  const rest = users.length - max;
  return (
    <div className="flex -space-x-2">
      {shown.map((u, i) => (
        <Avatar key={i} src={u.avatarUrl} name={u.name} size="xs" />
      ))}
      {rest > 0 && (
        <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium text-muted-foreground z-10">
          +{rest}
        </div>
      )}
    </div>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────
type TooltipSide = "top" | "bottom" | "left" | "right";

export function Tooltip({
  children,
  content,
  side = "top",
  className,
}: {
  children: React.ReactNode;
  content: string;
  side?: TooltipSide;
  className?: string;
}) {
  const sideClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  return (
    <div className={cn("relative group inline-flex", className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          "absolute px-2 py-1 text-xs rounded-md bg-popover border border-border text-popover-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg",
          sideClass,
        )}
      >
        {content}
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

// ── Progress Bar ───────────────────────────────────────────────────────────
export function ProgressBar({
  value,
  max = 100,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={cn(
        "h-1.5 w-full bg-muted rounded-full overflow-hidden",
        className,
      )}
    >
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Custom Select (custom drop-down) ───────────────────────────────────────
export { CustomSelect as Select } from "./custom-select";
export { CustomSelect } from "./custom-select";
export type { CustomSelectOption } from "./custom-select";

// ── Switch ─────────────────────────────────────────────────────────────────
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
}
export function Switch({ checked, onCheckedChange, id }: SwitchProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

// ── Loader ───────────────────────────────────────────────────────────────
export function Loader({
  className,
  accentColor,
  "aria-label": ariaLabel = "Loading",
}: {
  className?: string;
  accentColor?: string | null;
  "aria-label"?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
      className={cn(
        "fixed z-45 inset-0 animate-in fade-in duration-150",
        className,
      )}
    >
      <div className="absolute inset-0 bg-background/55 backdrop-blur-md" />
      <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden bg-border/40">
        <div
          className="h-full w-1/2 rounded-full animate-project-switch-progress"
          style={{
            background: accentColor
              ? `linear-gradient(90deg, transparent, ${accentColor}, var(--color-primary), transparent)`
              : `linear-gradient(90deg, transparent, var(--color-primary), var(--color-accent), transparent)`,
          }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-4 animate-scale-in">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div
              className="pointer-events-none absolute inset-0 m-auto h-24 w-24 rounded-full bg-primary/55 blur-3xl animate-loader-brand-glow"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 m-auto h-16 w-16 rounded-full bg-primary/40 blur-2xl animate-pulse"
              aria-hidden
            />
            <div
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-xl bg-primary",
                "ring-1 ring-white/10 animate-loader-logo-pulse",
              )}
            >
              <Zap
                className="h-7 w-7 text-primary-foreground animate-loader-zap"
                aria-hidden
              />
            </div>
          </div>

          <p className="text-xl font-bold tracking-tight text-foreground">
            Track<span className="text-primary">Ezz</span>
          </p>
        </div>
      </div>
    </div>
  );
}
