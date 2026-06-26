import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/25">
        <Zap className="h-4 w-4 text-primary-foreground" />
      </div>
      <span className="text-lg font-bold tracking-tight">
        Track<span className="text-primary">Ezz</span>
      </span>
    </Link>
  );
}
