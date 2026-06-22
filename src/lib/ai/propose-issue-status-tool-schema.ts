import { z } from "zod";

const proposalSnapshotSchema = z.object({
  issueId: z.string(),
  issueKey: z.string(),
  issueTitle: z.string(),
  fromStatus: z.string(),
  fromStatusLabel: z.string(),
  toStatus: z.string(),
  toStatusLabel: z.string(),
  reason: z.string(),
});

/** Full union including client-side phases so validateUIMessages accepts persisted history. */
export const proposeIssueStatusChangeOutputSchema = z.discriminatedUnion(
  "phase",
  [
    proposalSnapshotSchema.extend({ phase: z.literal("pending") }),
    z.object({
      phase: z.literal("validation_error"),
      message: z.string(),
    }),
    proposalSnapshotSchema.extend({ phase: z.literal("rejected") }),
    proposalSnapshotSchema.extend({ phase: z.literal("applied") }),
    proposalSnapshotSchema.extend({ phase: z.literal("superseded") }),
  ],
);
