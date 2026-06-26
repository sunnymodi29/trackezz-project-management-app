"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES } from "@/lib/auth/password-policy";

export function PasswordRequirements({ password }: { password: string }) {
  const showStatus = password.length > 0;

  return (
    <div
      className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
      aria-live="polite"
    >
      <p className="mb-2 text-xs font-medium text-foreground">
        Password requirements
      </p>
      <ul className="space-y-1.5">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                !showStatus && "text-muted-foreground",
                showStatus && met && "text-emerald-600 dark:text-emerald-400",
                showStatus && !met && "text-muted-foreground",
              )}
            >
              {showStatus ? (
                met ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                )
              ) : (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40"
                  aria-hidden
                />
              )}
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PasswordMatchHint({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}) {
  if (!confirmPassword) return null;

  const matches = password === confirmPassword;

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs",
        matches
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-destructive",
      )}
      role="status"
    >
      {matches ? (
        <>
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Passwords match
        </>
      ) : (
        <>
          <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Passwords do not match
        </>
      )}
    </p>
  );
}
