"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function AssistantMarkdown({ children }: { children: string }) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:my-1.5",
        "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4",
        "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4",
        "[&_li]:my-0.5",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-90",
        "[&_strong]:font-semibold",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.8125rem]",
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/50 [&_pre]:p-2 [&_pre]:text-xs",
      )}
    >
      <ReactMarkdown
        components={{
          a({ href, children: linkChildren }) {
            if (!href) return <span>{linkChildren}</span>;
            if (href.startsWith("/")) {
              return <Link href={href}>{linkChildren}</Link>;
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
