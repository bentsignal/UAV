import { v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { vTaskPriority, vTaskStatus } from "./validators";

const priorityRank = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
} satisfies Record<Doc<"tasks">["priority"], number>;

function prioritySort(a: Doc<"tasks">, b: Doc<"tasks">) {
  return priorityRank[a.priority] - priorityRank[b.priority];
}

function filterParent(
  tasks: Doc<"tasks">[],
  parentTaskId: Doc<"tasks">["parentTaskId"],
) {
  return parentTaskId
    ? tasks.filter((task) => task.parentTaskId === parentTaskId)
    : tasks;
}

export const listForProject = query({
  args: {
    projectId: v.id("projects"),
    parentTaskId: v.optional(v.id("tasks")),
    priority: v.optional(vTaskPriority),
    status: v.optional(vTaskStatus),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const search = args.query?.trim();
    if (search) {
      const tasks = await ctx.db
        .query("tasks")
        .withSearchIndex("search_text", (q) =>
          q.search("searchText", search).eq("projectId", args.projectId),
        )
        .take(50);

      return filterParent(tasks, args.parentTaskId)
        .filter((task) => !args.priority || task.priority === args.priority)
        .filter((task) => !args.status || task.status === args.status)
        .sort(prioritySort);
    }

    const { priority, status } = args;
    if (status) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project_status", (q) =>
          q.eq("projectId", args.projectId).eq("status", status),
        )
        .order("desc")
        .take(50);

      return filterParent(tasks, args.parentTaskId)
        .filter((task) => !priority || task.priority === priority)
        .sort(prioritySort);
    }

    if (priority) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project_priority", (q) =>
          q.eq("projectId", args.projectId).eq("priority", priority),
        )
        .order("desc")
        .take(50);

      return filterParent(tasks, args.parentTaskId);
    }

    const tasks = await Promise.all(
      (["urgent", "high", "normal", "low"] as const).map(async (level) =>
        ctx.db
          .query("tasks")
          .withIndex("by_project_priority", (q) =>
            q.eq("projectId", args.projectId).eq("priority", level),
          )
          .order("desc")
          .take(50),
      ),
    );

    return filterParent(tasks.flat(), args.parentTaskId).slice(0, 50);
  },
});
