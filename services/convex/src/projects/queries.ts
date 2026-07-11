import { v } from "convex/values";

import { authedQuery } from "../functions";

export const byRepoRoot = authedQuery({
  args: { repoRoot: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_repoRoot", (q) => q.eq("repoRoot", args.repoRoot))
      .unique();
  },
});

export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").order("desc").take(50);
  },
});
