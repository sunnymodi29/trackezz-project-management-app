import { htmlToPlainText } from "@/lib/ai/plain-text";

export function buildIssueEmbeddingSourceText(input: {
  title: string;
  description?: string | null;
  reproductionSteps?: string | null;
  expectedResult?: string | null;
  actualResult?: string | null;
  environment?: string | null;
}): string {
  const parts = [
    input.title.trim(),
    htmlToPlainText(input.description ?? ""),
    input.reproductionSteps?.trim(),
    input.expectedResult?.trim(),
    input.actualResult?.trim(),
    input.environment?.trim(),
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, 8000);
}
