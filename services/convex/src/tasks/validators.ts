import { v } from "convex/values";

export const vTaskStatus = v.union(
  v.literal("backlog"),
  v.literal("ready"),
  v.literal("active"),
  v.literal("blocked"),
  v.literal("done"),
  v.literal("cancelled"),
);

export const vTaskPriority = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent"),
);

export const vTask = v.object({
  projectId: v.id("projects"),
  sessionId: v.optional(v.id("sessions")),
  title: v.string(),
  body: v.optional(v.string()),
  status: vTaskStatus,
  priority: vTaskPriority,
  searchText: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
});
