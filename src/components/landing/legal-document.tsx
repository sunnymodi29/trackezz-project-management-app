import { cn } from "@/lib/utils";

export const LEGAL_LAST_UPDATED = "June 29, 2026";

export function LegalDocument({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <article>
      <header className="mb-8 border-b border-border pb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 text-muted-foreground leading-relaxed">{description}</p>
        ) : null}
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
      </header>
      <div className={cn("prose-tf space-y-6 text-sm leading-relaxed")}>
        {children}
      </div>
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
