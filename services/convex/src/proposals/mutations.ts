import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { vProposalKind } from "./validators";

export const create = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    kind: v.optional(vProposalKind),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const proposalId = await ctx.db.insert("proposals", {
      body: args.body,
      createdAt: now,
      kind: args.kind ?? "other",
      projectId: args.projectId,
      searchText: [args.title, args.body].join(" "),
      status: "open",
      title: args.title,
      updatedAt: now,
    });

    return proposalId;
  },
});
