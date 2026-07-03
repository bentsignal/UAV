import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { vTaskPriority, vTaskStatus } from "./validators";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    sessionId: v.optional(v.id("sessions")),
    title: v.string(),
    body: v.optional(v.string()),
    priority: v.optional(vTaskPriority),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      body: args.body,
      createdAt: now,
      priority: args.priority ?? "normal",
      projectId: args.projectId,
      searchText: [args.title, args.body].filter(Boolean).join(" "),
      sessionId: args.sessionId,
      status: "backlog",
      title: args.title,
      updatedAt: now,
    });

    await ctx.db.insert("events", {
      createdAt: now,
      kind: "task.created",
      projectId: args.projectId,
      sessionId: args.sessionId,
      summary: args.title,
      taskId,
    });

    return taskId;
  },
});

export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: vTaskStatus,
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, {
      completedAt: args.status === "done" ? now : undefined,
      status: args.status,
      updatedAt: now,
    });

    await ctx.db.insert("events", {
      createdAt: now,
      kind: args.status === "done" ? "task.completed" : "task.updated",
      projectId: task.projectId,
      sessionId: task.sessionId,
      summary: args.summary ?? `Task marked ${args.status}`,
      taskId: args.taskId,
    });
  },
});
