import { v } from "convex/values";

import { query } from "../_generated/server";

export const activeForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_project_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "active"),
      )
      .order("desc")
      .collect();
  },
});
