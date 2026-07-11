import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { authedMutation } from "../functions";
import { vTaskKind, vTaskPriority, vTaskStatus } from "./validators";

interface TaskUpdateInput {
  body?: string;
  kind?: Doc<"tasks">["kind"];
  parentTaskId?: Id<"tasks">;
  priority?: Doc<"tasks">["priority"];
  status?: Doc<"tasks">["status"];
  tags?: string[];
  title?: string;
}

function taskSearchText(
  title: string,
  body: string | undefined,
  tags: string[],
) {
  return [title, body, ...tags].filter(Boolean).join(" ");
}

function completedAtForStatus(
  status: string,
  previousCompletedAt: number | undefined,
  now: number,
) {
  if (status === "done") return previousCompletedAt ?? now;

  return undefined;
}

function taskUpdatePatch(
  args: TaskUpdateInput,
  task: Doc<"tasks">,
  now: number,
) {
  const title = args.title ?? task.title;
  const body = args.body ?? task.body;
  const status = args.status ?? task.status;
  const tags = args.tags ?? task.tags;

  return {
    body,
    completedAt: completedAtForStatus(status, task.completedAt, now),
    kind: args.kind ?? task.kind,
    parentTaskId: args.parentTaskId ?? task.parentTaskId,
    priority: args.priority ?? task.priority,
    searchText: taskSearchText(title, body, tags),
    status,
    tags,
    title,
    updatedAt: now,
  };
}

export const create = authedMutation({
  args: {
    projectId: v.id("projects"),
    parentTaskId: v.optional(v.id("tasks")),
    title: v.string(),
    body: v.optional(v.string()),
    kind: v.optional(vTaskKind),
    priority: v.optional(vTaskPriority),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tags = args.tags ?? [];
    const taskId = await ctx.db.insert("tasks", {
      body: args.body,
      createdAt: now,
      kind: args.kind ?? "task",
      parentTaskId: args.parentTaskId,
      priority: args.priority ?? "normal",
      projectId: args.projectId,
      searchText: taskSearchText(args.title, args.body, tags),
      status: "todo",
      tags,
      title: args.title,
      updatedAt: now,
    });

    return taskId;
  },
});

export const updateStatus = authedMutation({
  args: {
    taskId: v.id("tasks"),
    status: vTaskStatus,
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
  },
});

export const update = authedMutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.optional(vTaskStatus),
    priority: v.optional(vTaskPriority),
    kind: v.optional(vTaskKind),
    tags: v.optional(v.array(v.string())),
    parentTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    const patch = taskUpdatePatch(args, task, now);

    await ctx.db.patch(args.taskId, patch);
  },
});
