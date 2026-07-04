import { v } from "convex/values";

export const vMemorySourceType = v.union(v.literal("note"), v.literal("task"));

export const vMemoryEmbedding = v.object({
  projectId: v.id("projects"),
  sourceType: vMemorySourceType,
  noteId: v.optional(v.id("notes")),
  taskId: v.optional(v.id("tasks")),
  sourceUpdatedAt: v.number(),
  chunkIndex: v.number(),
  chunkCount: v.number(),
  model: v.string(),
  dimensions: v.number(),
  embedding: v.array(v.float64()),
  indexedAt: v.number(),
});
