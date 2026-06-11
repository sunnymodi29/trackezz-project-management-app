/** True when the string looks like HTML from the rich editor. */
export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

/** True when editor HTML has no meaningful text content. */
export function isEmptyRichText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}

/** Strip empty editor output before persisting. */
export function normalizeRichTextForSave(
  html: string | undefined,
): string | undefined {
  if (!html || isEmptyRichText(html)) return undefined;
  return html;
}

/** Whether comment/description content has text (plain or HTML). */
export function hasRichTextContent(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (looksLikeHtml(trimmed)) return !isEmptyRichText(trimmed);
  return true;
}
