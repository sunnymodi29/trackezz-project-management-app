import { cn } from "@/lib/utils";

export interface AvatarProps {
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
        <img
          key={src}
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

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
