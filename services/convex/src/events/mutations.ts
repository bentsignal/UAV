import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { vEventKind } from "./validators";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    sessionId: v.optional(v.id("sessions")),
    taskId: v.optional(v.id("tasks")),
    agentId: v.optional(v.id("agents")),
    kind: v.optional(vEventKind),
    summary: v.string(),
    body: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      agentId: args.agentId,
      body: args.body,
      createdAt: Date.now(),
      kind: args.kind ?? "report",
      metadata: args.metadata,
      projectId: args.projectId,
      sessionId: args.sessionId,
      summary: args.summary,
      taskId: args.taskId,
    });
  },
});
