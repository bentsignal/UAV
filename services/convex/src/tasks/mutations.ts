import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { authedMutation } from "../functions";
import { vTaskKind, vTaskPriority, vTaskStatus } from "./validators";

interface TaskUpdateInput {
  body?: string;
  blockerTaskId?: Id<"tasks">;
  completionEvidence?: string;
  kind?: Doc<"tasks">["kind"];
  parentTaskId?: Id<"tasks">;
  priority?: Doc<"tasks">["priority"];
  runId?: string;
  status?: Doc<"tasks">["status"];
  statusReason?: string;
  tags?: string[];
  title?: string;
}

interface TaskTransition {
  blockerTaskId?: Id<"tasks">;
  completionEvidence?: string;
  status: Doc<"tasks">["status"];
  statusReason?: string;
}

const REASONED_STATUSES = new Set<Doc<"tasks">["status"]>([
  "blocked",
  "deferred",
  "canceled",
]);

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
  if (status === "done" || status === "canceled") {
    return previousCompletedAt ?? now;
  }

  return undefined;
}

function nonEmpty(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized;
}

function requiresReason(
  status: Doc<"tasks">["status"],
  previousStatus: Doc<"tasks">["status"],
) {
  return (
    REASONED_STATUSES.has(status) ||
    (status === "todo" && previousStatus === "in_progress")
  );
}

function validateReason(transition: TaskTransition, task: Doc<"tasks">) {
  if (!requiresReason(transition.status, task.status)) return;
  if (transition.statusReason) return;
  if (transition.status === "todo") {
    throw new Error("Returning an in-progress task to todo requires --reason");
  }
  throw new Error(`${transition.status} tasks require --reason`);
}

function validateEvidence(transition: TaskTransition) {
  if (transition.status !== "done" || transition.completionEvidence) return;
  throw new Error("Completed tasks require --evidence");
}

async function validateBlocker(
  ctx: MutationCtx,
  task: Doc<"tasks">,
  transition: TaskTransition,
) {
  if (!transition.blockerTaskId) return;
  if (transition.blockerTaskId === task._id) {
    throw new Error("A task cannot block itself");
  }
  const blocker = await ctx.db.get(transition.blockerTaskId);
  if (!blocker || blocker.projectId !== task.projectId) {
    throw new Error("Blocker task must belong to the same project");
  }
}

async function validateTransition(
  ctx: MutationCtx,
  args: TaskUpdateInput,
  task: Doc<"tasks">,
) {
  const status = args.status ?? task.status;
  const transition = {
    blockerTaskId:
      status === "blocked"
        ? (args.blockerTaskId ?? task.blockerTaskId)
        : undefined,
    completionEvidence: nonEmpty(
      args.completionEvidence ?? task.completionEvidence,
    ),
    status,
    statusReason: nonEmpty(args.statusReason ?? task.statusReason),
  } satisfies TaskTransition;

  validateReason(transition, task);
  validateEvidence(transition);
  await validateBlocker(ctx, task, transition);
  return transition;
}

async function updateClaim(options: {
  ctx: MutationCtx;
  now: number;
  runId?: string;
  task: Doc<"tasks">;
  transition: TaskTransition;
}) {
  const { ctx, now, runId, task, transition } = options;
  const activeClaim = await ctx.db
    .query("taskClaims")
    .withIndex("by_task_status", (q) =>
      q.eq("taskId", task._id).eq("status", "active"),
    )
    .unique();

  if (transition.status === "in_progress") {
    if (!runId) {
      throw new Error(
        "Starting work requires CODEX_THREAD_ID or UAV_RUN_ID to identify the run",
      );
    }
    if (activeClaim && activeClaim.runId !== runId) {
      throw new Error("Task is already claimed by another run");
    }
    if (!activeClaim) {
      await ctx.db.insert("taskClaims", {
        projectId: task.projectId,
        runId,
        startedAt: now,
        status: "active",
        taskId: task._id,
        updatedAt: now,
      });
    }
    return;
  }

  if (!activeClaim) return;
  if (!runId || activeClaim.runId !== runId) {
    throw new Error("Only the run that claimed this task can resolve it");
  }
  await ctx.db.patch(activeClaim._id, {
    completionEvidence: transition.completionEvidence,
    endedAt: now,
    finalTaskStatus: transition.status,
    status: "closed",
    statusReason: transition.statusReason,
    updatedAt: now,
  });
}

function statusReasonForPatch(transition: TaskTransition, task: Doc<"tasks">) {
  if (REASONED_STATUSES.has(transition.status)) return transition.statusReason;
  if (transition.status === "todo" && task.status === "in_progress") {
    return transition.statusReason;
  }
  return undefined;
}

async function taskUpdatePatch(
  ctx: MutationCtx,
  args: TaskUpdateInput,
  task: Doc<"tasks">,
  now: number,
) {
  const title = args.title ?? task.title;
  const body = args.body ?? task.body;
  const tags = args.tags ?? task.tags;
  const transition = await validateTransition(ctx, args, task);

  await updateClaim({ ctx, now, runId: args.runId, task, transition });

  return {
    body,
    blockerTaskId: transition.blockerTaskId,
    completedAt: completedAtForStatus(transition.status, task.completedAt, now),
    completionEvidence:
      transition.status === "done" ? transition.completionEvidence : undefined,
    kind: args.kind ?? task.kind,
    parentTaskId: args.parentTaskId ?? task.parentTaskId,
    priority: args.priority ?? task.priority,
    searchText: taskSearchText(title, body, tags),
    status: transition.status,
    statusReason: statusReasonForPatch(transition, task),
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
    statusReason: v.optional(v.string()),
    completionEvidence: v.optional(v.string()),
    blockerTaskId: v.optional(v.id("tasks")),
    runId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const patch = await taskUpdatePatch(ctx, args, task, now);
    await ctx.db.patch(args.taskId, patch);
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
    blockerTaskId: v.optional(v.id("tasks")),
    statusReason: v.optional(v.string()),
    completionEvidence: v.optional(v.string()),
    runId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    const patch = await taskUpdatePatch(ctx, args, task, now);

    await ctx.db.patch(args.taskId, patch);
  },
});
