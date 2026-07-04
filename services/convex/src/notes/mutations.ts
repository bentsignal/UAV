import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { vNoteKind, vNoteScope } from "./validators";

export const create = mutation({
  args: {
    scope: v.optional(vNoteScope),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    body: v.string(),
    kind: v.optional(vNoteKind),
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
      body: args.body,
      createdAt: now,
      kind: args.kind ?? "note",
      projectId: args.projectId,
      scope,
      tags: args.tags ?? [],
      taskId: args.taskId,
      updatedAt: now,
    });

    return noteId;
  },
});
