import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { vMemorySourceType } from "./memory/validators";

export const fetchNote = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.noteId);
  },
});

export const fetchTask = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

export const fetchProjectSources = internalQuery({
  args: { projectId: v.id("projects"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_project_createdAt", (q) =>
        q.eq("projectId", args.projectId),
      )
      .order("desc")
      .take(limit);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project_priority", (q) =>
        q.eq("projectId", args.projectId),
      )
      .take(limit);

    return { notes, tasks };
  },
});

export const replaceSourceEmbeddings = internalMutation({
  args: {
    projectId: v.id("projects"),
    sourceType: vMemorySourceType,
    noteId: v.optional(v.id("notes")),
    taskId: v.optional(v.id("tasks")),
    sourceUpdatedAt: v.number(),
    model: v.string(),
    dimensions: v.number(),
    chunks: v.array(
      v.object({
        chunkIndex: v.number(),
        embedding: v.array(v.float64()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing =
      args.sourceType === "note" && args.noteId
        ? await ctx.db
            .query("memoryEmbeddings")
            .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
            .collect()
        : args.taskId
          ? await ctx.db
              .query("memoryEmbeddings")
              .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
              .collect()
          : [];

    await Promise.all(
      existing.map((embedding) => ctx.db.delete(embedding._id)),
    );

    const now = Date.now();
    await Promise.all(
      args.chunks.map((chunk) =>
        ctx.db.insert("memoryEmbeddings", {
          chunkCount: args.chunks.length,
          chunkIndex: chunk.chunkIndex,
          dimensions: args.dimensions,
          embedding: chunk.embedding,
          indexedAt: now,
          model: args.model,
          noteId: args.noteId,
          projectId: args.projectId,
          sourceType: args.sourceType,
          sourceUpdatedAt: args.sourceUpdatedAt,
          taskId: args.taskId,
        }),
      ),
    );

    return { deleted: existing.length, inserted: args.chunks.length };
  },
});

export const fetchSearchResults = internalQuery({
  args: { ids: v.array(v.id("memoryEmbeddings")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const id of args.ids) {
      const embedding = await ctx.db.get(id);
      if (!embedding) continue;

      const source =
        embedding.sourceType === "note" && embedding.noteId
          ? await ctx.db.get(embedding.noteId)
          : embedding.taskId
            ? await ctx.db.get(embedding.taskId)
            : null;
      if (!source) continue;

      results.push({ embedding, source });
    }

    return results;
  },
});
