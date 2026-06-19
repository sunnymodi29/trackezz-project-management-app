import { embed } from "ai";
import { prisma } from "@/lib/db";
import { buildIssueEmbeddingSourceText } from "@/lib/ai/issue-embedding-text";
import {
  ISSUE_EMBEDDING_MODEL_NAME,
  getOpenAiEmbeddingModel,
} from "@/lib/ai/models";
import { serializeEmbeddingVector } from "@/lib/ai/vectors";

export async function upsertIssueEmbeddingRow(issueId: string): Promise<void> {
  const embeddingModel = getOpenAiEmbeddingModel();
  if (!embeddingModel) return;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      title: true,
      description: true,
      reproductionSteps: true,
      expectedResult: true,
      actualResult: true,
      environment: true,
    },
  });
  if (!issue) return;

  const text = buildIssueEmbeddingSourceText(issue);
  if (!text.trim()) return;

  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });

  await prisma.$transaction([
    prisma.embedding.deleteMany({ where: { issueId } }),
    prisma.embedding.create({
      data: {
        issueId,
        vector: serializeEmbeddingVector(embedding),
        model: ISSUE_EMBEDDING_MODEL_NAME,
      },
    }),
  ]);
}
