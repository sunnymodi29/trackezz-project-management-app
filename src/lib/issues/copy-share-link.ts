import { getIssueShareUrl } from "@/lib/projects/route";

/** Plain share line — no URL visible: "TE-106 Issue title" */
export function formatIssueSharePlainText(
  issueKey: string,
  title: string,
): string {
  return `${issueKey} ${title}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Rich paste: linked key + title, URL hidden in href only */
export function formatIssueShareHtml(
  issueKey: string,
  title: string,
  url: string,
): string {
  return `<a href="${escapeHtml(url)}">${escapeHtml(issueKey)}</a> ${escapeHtml(title)}`;
}

export async function copyIssueShareLink(
  origin: string,
  projectKey: string,
  issueId: string,
  issueKey: string,
  title: string,
): Promise<void> {
  const url = getIssueShareUrl(origin, projectKey, issueId);
  const plain = formatIssueSharePlainText(issueKey, title);
  const html = formatIssueShareHtml(issueKey, title, url);

  if (typeof ClipboardItem !== "undefined") {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([plain], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    return;
  }

  await navigator.clipboard.writeText(plain);
}
