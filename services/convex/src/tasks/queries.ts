import { v } from "convex/values";

import { query } from "../_generated/server";
import { vTaskStatus } from "./validators";

export const listForProject = query({
  args: {
    projectId: v.id("projects"),
    parentTaskId: v.optional(v.id("tasks")),
    status: v.optional(vTaskStatus),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const search = args.query?.trim();
    if (search) {
      return await ctx.db
        .query("tasks")
        .withSearchIndex("search_text", (q) =>
          q.search("searchText", search).eq("projectId", args.projectId),
        )
        .take(50);
    }

    const { status } = args;
    if (status) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project_status", (q) =>
          q.eq("projectId", args.projectId).eq("status", status),
        )
        .order("desc")
        .take(50);

      return args.parentTaskId
        ? tasks.filter((task) => task.parentTaskId === args.parentTaskId)
        : tasks;
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project_priority", (q) =>
        q.eq("projectId", args.projectId),
      )
      .order("desc")
      .take(50);

    return args.parentTaskId
      ? tasks.filter((task) => task.parentTaskId === args.parentTaskId)
      : tasks;
  },
});
