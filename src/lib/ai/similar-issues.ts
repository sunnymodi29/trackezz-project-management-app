import { embed } from "ai";
import { prisma } from "@/lib/db";
import { htmlToPlainText, tokenizeForLexical } from "@/lib/ai/plain-text";
import { buildIssueEmbeddingSourceText } from "@/lib/ai/issue-embedding-text";
import { getOpenAiEmbeddingModel } from "@/lib/ai/models";
import { cosineSimilarity, parseEmbeddingVectorJson } from "@/lib/ai/vectors";

export type SimilarIssueHit = {
  id: string;
  issueKey: string;
  title: string;
  status: string;
  score: number;
  match: "semantic" | "lexical";
};

function lexicalScore(
  query: string,
  title: string,
  description?: string | null,
) {
  const q = tokenizeForLexical(htmlToPlainText(query));
  const doc = tokenizeForLexical(
    `${title} ${htmlToPlainText(description ?? "")}`,
  );
  if (q.size === 0 || doc.size === 0) return 0;
  let inter = 0;
  for (const w of q) {
    if (doc.has(w)) inter += 1;
  }
  return inter / Math.sqrt(q.size * doc.size);
}

export async function findSimilarIssuesForProject(options: {
  projectId: string;
  title: string;
  description?: string | null;
  excludeIssueId?: string;
  limit?: number;
}): Promise<SimilarIssueHit[]> {
  const limit = options.limit ?? 6;
  const draftText = buildIssueEmbeddingSourceText({
    title: options.title,
    description: options.description,
  });

  const rows = await prisma.issue.findMany({
    where: {
      projectId: options.projectId,
      ...(options.excludeIssueId
        ? { id: { not: options.excludeIssueId } }
        : {}),
    },
    select: {
      id: true,
      issueKey: true,
      title: true,
      description: true,
      status: true,
      embeddings: { select: { vector: true } },
    },
    take: 400,
    orderBy: { updatedAt: "desc" },
  });

  const embeddingModel = getOpenAiEmbeddingModel();
  let queryVector: number[] | null = null;
  if (embeddingModel && draftText.trim()) {
    const { embedding } = await embed({
      model: embeddingModel,
      value: draftText,
    });
    queryVector = embedding;
  }

  const scored: SimilarIssueHit[] = [];

  for (const row of rows) {
    let bestSemantic = 0;
    for (const e of row.embeddings) {
      const vec = parseEmbeddingVectorJson(e.vector);
      if (!vec || !queryVector) continue;
      bestSemantic = Math.max(bestSemantic, cosineSimilarity(queryVector, vec));
    }
    const lex = lexicalScore(
      `${options.title}\n${htmlToPlainText(options.description ?? "")}`,
      row.title,
      row.description,
    );

    const semanticHit = bestSemantic >= 0.72;
    const lexicalHit = lex >= 0.18;
    if (!semanticHit && !lexicalHit) continue;

    const score = semanticHit ? bestSemantic : lex;
    scored.push({
      id: row.id,
      issueKey: row.issueKey,
      title: row.title,
      status: row.status,
      score,
      match: semanticHit ? "semantic" : "lexical",
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
