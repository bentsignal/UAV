import { mutation } from "../_generated/server";
import { vAgent } from "./validators";

export const upsert = mutation({
  args: vAgent,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        host: args.host,
        kind: args.kind,
        lastSeenAt: args.lastSeenAt,
        metadata: args.metadata,
      });
      return existing._id;
    }

    return await ctx.db.insert("agents", args);
  },
});
