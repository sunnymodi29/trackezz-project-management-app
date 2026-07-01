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
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all duration-150 sm:h-[15px] sm:min-h-0 sm:w-[15px] sm:min-w-0 sm:rounded-[4px]",
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
