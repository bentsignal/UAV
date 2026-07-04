import { v } from "convex/values";

export const vNoteScope = v.union(v.literal("project"), v.literal("global"));

export const vNote = v.object({
  scope: v.optional(vNoteScope),
  projectId: v.optional(v.id("projects")),
  sessionId: v.optional(v.id("sessions")),
  taskId: v.optional(v.id("tasks")),
  agentId: v.optional(v.id("agents")),
  body: v.string(),
  tags: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});
