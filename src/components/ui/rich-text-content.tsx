import { cn } from "@/lib/utils";
import { looksLikeHtml } from "@/lib/rich-text";

interface RichTextContentProps {
  content: string;
  className?: string;
}

export function RichTextContent({ content, className }: RichTextContentProps) {
  if (!content.trim()) return null;

  if (looksLikeHtml(content)) {
    return (
      <div
        className={cn(
          "rich-text-content prose-tf text-muted-foreground",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <p
      className={cn(
        "text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap",
        className,
      )}
    >
      {content}
    </p>
  );
}
