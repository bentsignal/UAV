import { v } from "convex/values";

import { mutation } from "../_generated/server";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    sessionId: v.optional(v.id("sessions")),
    taskId: v.optional(v.id("tasks")),
    agentId: v.optional(v.id("agents")),
    body: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const noteId = await ctx.db.insert("notes", {
      agentId: args.agentId,
      body: args.body,
      createdAt: now,
      projectId: args.projectId,
      sessionId: args.sessionId,
      tags: args.tags ?? [],
      taskId: args.taskId,
      updatedAt: now,
    });

    await ctx.db.insert("events", {
      agentId: args.agentId,
      createdAt: now,
      kind: "note.created",
      projectId: args.projectId,
      sessionId: args.sessionId,
      summary: args.body.slice(0, 120),
      taskId: args.taskId,
    });

    return noteId;
  },
});
