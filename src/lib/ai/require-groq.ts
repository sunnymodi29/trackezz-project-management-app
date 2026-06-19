import { getGroqLanguageModel } from "@/lib/ai/models";

export function requireGroqLanguageModel() {
  const model = getGroqLanguageModel();
  if (!model) {
    throw new Error("FORBIDDEN: GROQ_API_KEY is not configured");
  }
  return model;
}
