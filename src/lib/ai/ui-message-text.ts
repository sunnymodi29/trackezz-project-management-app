import type { UIMessage } from "ai";

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

export function uiMessagesToStoredRows(messages: UIMessage[]) {
  const rows: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const text = textFromUiMessageParts(m);
    if (!text) continue;
    rows.push({ role: m.role, content: text });
  }
  return rows;
}
