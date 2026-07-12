import { v } from "convex/values";

import { vTaskStatus } from "../tasks/validators";

export const vTaskClaimStatus = v.union(
  v.literal("active"),
  v.literal("closed"),
);

export const vTaskClaim = v.object({
  projectId: v.id("projects"),
  taskId: v.id("tasks"),
  runId: v.string(),
  status: vTaskClaimStatus,
  startedAt: v.number(),
  updatedAt: v.number(),
  endedAt: v.optional(v.number()),
  finalTaskStatus: v.optional(vTaskStatus),
  statusReason: v.optional(v.string()),
  completionEvidence: v.optional(v.string()),
});
