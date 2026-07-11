import { v } from "convex/values";

import { authedQuery } from "../functions";
import { vProposalStatus } from "./validators";

export const list = authedQuery({
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
