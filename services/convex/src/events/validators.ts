import { v } from "convex/values";

export const vEventKind = v.union(
  v.literal("session.started"),
  v.literal("session.updated"),
  v.literal("session.ended"),
  v.literal("task.created"),
  v.literal("task.updated"),
  v.literal("task.completed"),
  v.literal("note.created"),
  v.literal("proposal.created"),
  v.literal("report"),
);

export const vEvent = v.object({
  projectId: v.id("projects"),
  sessionId: v.optional(v.id("sessions")),
  taskId: v.optional(v.id("tasks")),
  agentId: v.optional(v.id("agents")),
  kind: vEventKind,
  summary: v.string(),
  body: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
});
