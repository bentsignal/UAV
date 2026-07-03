import { v } from "convex/values";

import { query } from "../_generated/server";
import { vTaskStatus } from "./validators";

export const listForProject = query({
  args: {
    projectId: v.id("projects"),
    status: v.optional(vTaskStatus),
  },
  handler: async (ctx, args) => {
    const { status } = args;
    if (status) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_project_status", (q) =>
          q.eq("projectId", args.projectId).eq("status", status),
        )
        .order("desc")
        .take(50);
    }

    return await ctx.db
      .query("tasks")
      .withIndex("by_project_priority", (q) =>
        q.eq("projectId", args.projectId),
      )
      .order("desc")
      .take(50);
  },
});
