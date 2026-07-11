import { v } from "convex/values";

import { authedMutation } from "../functions";

export const upsert = authedMutation({
  args: {
    name: v.string(),
    repoRoot: v.string(),
    remoteUrl: v.optional(v.string()),
    defaultBranch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_repoRoot", (q) => q.eq("repoRoot", args.repoRoot))
      .unique();
    const searchText = [args.name, args.repoRoot, args.remoteUrl]
      .filter(Boolean)
      .join(" ");

    if (existing) {
      await ctx.db.patch(existing._id, {
        defaultBranch: args.defaultBranch,
        name: args.name,
        remoteUrl: args.remoteUrl,
        searchText,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("projects", {
      createdAt: now,
      defaultBranch: args.defaultBranch,
      name: args.name,
      remoteUrl: args.remoteUrl,
      repoRoot: args.repoRoot,
      searchText,
      updatedAt: now,
    });
  },
});
