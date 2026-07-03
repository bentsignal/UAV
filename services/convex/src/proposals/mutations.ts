import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { vProposalKind } from "./validators";

export const create = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    sessionId: v.optional(v.id("sessions")),
    agentId: v.optional(v.id("agents")),
    kind: v.optional(vProposalKind),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const proposalId = await ctx.db.insert("proposals", {
      agentId: args.agentId,
      body: args.body,
      createdAt: now,
      kind: args.kind ?? "other",
      projectId: args.projectId,
      searchText: [args.title, args.body].join(" "),
      sessionId: args.sessionId,
      status: "open",
      title: args.title,
      updatedAt: now,
    });

    if (args.projectId) {
      await ctx.db.insert("events", {
        agentId: args.agentId,
        createdAt: now,
        kind: "proposal.created",
        projectId: args.projectId,
        sessionId: args.sessionId,
        summary: args.title,
      });
    }

    return proposalId;
  },
});
