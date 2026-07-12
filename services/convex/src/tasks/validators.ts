import { v } from "convex/values";

export const vTaskStatus = v.union(
  v.literal("todo"),
  v.literal("deferred"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("done"),
  v.literal("canceled"),
);

export const vTaskPriority = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent"),
);

export const vTaskKind = v.union(
  v.literal("task"),
  v.literal("bug"),
  v.literal("idea"),
  v.literal("chore"),
  v.literal("goal"),
);

export const vTask = v.object({
  projectId: v.id("projects"),
  parentTaskId: v.optional(v.id("tasks")),
  blockerTaskId: v.optional(v.id("tasks")),
  title: v.string(),
  body: v.optional(v.string()),
  status: vTaskStatus,
  statusReason: v.optional(v.string()),
  completionEvidence: v.optional(v.string()),
  priority: vTaskPriority,
  kind: vTaskKind,
  tags: v.array(v.string()),
  searchText: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
});
