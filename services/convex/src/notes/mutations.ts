import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { vNoteScope } from "./validators";

export const create = mutation({
  args: {
    scope: v.optional(vNoteScope),
    projectId: v.optional(v.id("projects")),
    sessionId: v.optional(v.id("sessions")),
    taskId: v.optional(v.id("tasks")),
    agentId: v.optional(v.id("agents")),
    body: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const scope = args.scope ?? (args.projectId ? "project" : "global");

    if (scope === "project" && !args.projectId) {
      throw new Error("Project notes require a projectId");
    }

    if (scope === "global" && args.projectId) {
      throw new Error("Global notes cannot include a projectId");
    }

    const noteId = await ctx.db.insert("notes", {
      agentId: args.agentId,
      body: args.body,
      createdAt: now,
      projectId: args.projectId,
      scope,
      sessionId: args.sessionId,
      tags: args.tags ?? [],
      taskId: args.taskId,
      updatedAt: now,
    });

    if (args.projectId) {
      await ctx.db.insert("events", {
        agentId: args.agentId,
        createdAt: now,
        kind: "note.created",
        projectId: args.projectId,
        sessionId: args.sessionId,
        summary: args.body.slice(0, 120),
        taskId: args.taskId,
      });
    }

    return noteId;
  },
});
