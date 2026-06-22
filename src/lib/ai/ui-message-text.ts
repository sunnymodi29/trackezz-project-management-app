import type { UIMessage } from "ai";

/** Persisted assistant payloads that include tool / structured UI parts. */
export const ASSISTANT_UI_MESSAGE_PREFIX = "__TF_UI_MSG__";

export function textFromUiMessageParts(message: UIMessage): string {
  const parts = message.parts ?? [];
  const chunks: string[] = [];
  for (const p of parts) {
    if (p.type === "text" && typeof p.text === "string") {
      chunks.push(p.text);
    }
  }
  return chunks.join("\n").trim();
}

function assistantMessageNeedsStructuredPersistence(m: UIMessage): boolean {
  const parts = m.parts ?? [];
  if (parts.length === 0) return false;
  if (parts.length > 1) return true;
  return parts[0]!.type !== "text";
}

export function uiMessagesToStoredRows(messages: UIMessage[]) {
  const rows: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    if (m.role === "assistant" && assistantMessageNeedsStructuredPersistence(m)) {
      rows.push({
        role: "assistant",
        content:
          ASSISTANT_UI_MESSAGE_PREFIX +
          JSON.stringify({ parts: m.parts ?? [] }),
      });
      continue;
    }
    const text = textFromUiMessageParts(m);
    if (!text) continue;
    rows.push({ role: m.role, content: text });
  }
  return rows;
}
