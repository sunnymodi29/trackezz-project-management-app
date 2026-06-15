"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  className,
  "aria-label": ariaLabel,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      id={id}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        checked
          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "border-input bg-card/50 hover:border-primary/40 hover:bg-accent/40",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      {checked ? (
        <Check className="h-[10px] w-[10px]" strokeWidth={3} aria-hidden />
      ) : null}
    </button>
  );
}
