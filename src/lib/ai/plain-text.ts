/** Strip HTML to plain text for embeddings and model prompts. */
export function htmlToPlainText(html: string | undefined | null): string {
  if (!html) return "";
  const withoutTags = html.replace(/<[^>]+>/g, " ");
  const collapsed = withoutTags.replace(/\s+/g, " ").trim();
  return collapsed;
}

export function tokenizeForLexical(text: string): Set<string> {
  const lower = text.toLowerCase();
  const words = lower.split(/[^a-z0-9_#]+/).filter((w) => w.length > 1);
  return new Set(words);
}
