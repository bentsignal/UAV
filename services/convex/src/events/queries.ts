import { v } from "convex/values";

import { query } from "../_generated/server";

export const recentForProject = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_project_createdAt", (q) =>
        q.eq("projectId", args.projectId),
      )
      .order("desc")
      .take(args.limit ?? 25);
  },
});
