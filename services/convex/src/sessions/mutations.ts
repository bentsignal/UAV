import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { vSessionStatus } from "./validators";

export const start = mutation({
  args: {
    projectId: v.id("projects"),
    agentId: v.id("agents"),
    goal: v.optional(v.string()),
    branch: v.optional(v.string()),
    worktreeRoot: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      agentId: args.agentId,
      branch: args.branch,
      goal: args.goal,
      projectId: args.projectId,
      startedAt: now,
      status: "active",
      updatedAt: now,
      worktreeRoot: args.worktreeRoot,
    });

    await ctx.db.insert("events", {
      agentId: args.agentId,
      createdAt: now,
      kind: "session.started",
      projectId: args.projectId,
      sessionId,
      summary: args.goal ?? "Session started",
    });

    return sessionId;
  },
});

export const updateStatus = mutation({
  args: {
    sessionId: v.id("sessions"),
    status: vSessionStatus,
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.sessionId, {
      endedAt: args.status === "done" ? now : undefined,
      status: args.status,
      updatedAt: now,
    });

    await ctx.db.insert("events", {
      agentId: session.agentId,
      createdAt: now,
      kind: args.status === "done" ? "session.ended" : "session.updated",
      projectId: session.projectId,
      sessionId: args.sessionId,
      summary: args.summary ?? `Session marked ${args.status}`,
    });
  },
});
