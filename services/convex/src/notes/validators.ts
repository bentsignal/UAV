import { v } from "convex/values";

export const vNoteScope = v.union(v.literal("project"), v.literal("global"));

export const vNoteKind = v.union(
  v.literal("note"),
  v.literal("intent"),
  v.literal("decision"),
  v.literal("idea"),
);

export const vNote = v.object({
  scope: v.optional(vNoteScope),
  kind: vNoteKind,
  projectId: v.optional(v.id("projects")),
  taskId: v.optional(v.id("tasks")),
  body: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});
