import { v } from "convex/values";

import { query } from "../_generated/server";
import { vProposalStatus } from "./validators";

export const list = query({
  args: {
    status: v.optional(vProposalStatus),
  },
  handler: async (ctx, args) => {
    const { status } = args;
    if (!status) return await ctx.db.query("proposals").order("desc").take(50);

    return await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .take(50);
  },
});
