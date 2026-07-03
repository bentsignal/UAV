import { v } from "convex/values";

export const vSessionStatus = v.union(
  v.literal("active"),
  v.literal("idle"),
  v.literal("blocked"),
  v.literal("done"),
);

export const vSession = v.object({
  projectId: v.id("projects"),
  agentId: v.id("agents"),
  status: vSessionStatus,
  goal: v.optional(v.string()),
  branch: v.optional(v.string()),
  worktreeRoot: v.string(),
  startedAt: v.number(),
  updatedAt: v.number(),
  endedAt: v.optional(v.number()),
});
