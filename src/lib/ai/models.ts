import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const GROQ_MODEL_ID = "llama-3.3-70b-versatile" as const;
const EMBEDDING_MODEL_ID = "text-embedding-3-small" as const;

export function getGroqLanguageModel(): LanguageModel | null {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  const groq = createGroq({ apiKey: key });
  return groq(GROQ_MODEL_ID);
}

export function getOpenAiEmbeddingModel() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const openai = createOpenAI({ apiKey: key });
  return openai.embedding(EMBEDDING_MODEL_ID);
}

export const ISSUE_EMBEDDING_MODEL_NAME = EMBEDDING_MODEL_ID;
