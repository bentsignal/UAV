import { defineSchema, defineTable } from "convex/server";

import { vAgent } from "./agents/validators";
import { vEvent } from "./events/validators";
import { vNote } from "./notes/validators";
import { vProject } from "./projects/validators";
import { vProposal } from "./proposals/validators";
import { vSession } from "./sessions/validators";
import { vTask } from "./tasks/validators";

export default defineSchema(
  {
    projects: defineTable(vProject)
      .index("by_repoRoot", ["repoRoot"])
      .index("by_remoteUrl", ["remoteUrl"])
      .searchIndex("search_name", { searchField: "searchText" }),
    agents: defineTable(vAgent)
      .index("by_name", ["name"])
      .index("by_host", ["host"]),
    sessions: defineTable(vSession)
      .index("by_project_status", ["projectId", "status"])
      .index("by_agent_status", ["agentId", "status"])
      .index("by_worktree", ["worktreeRoot"]),
    tasks: defineTable(vTask)
      .index("by_project_status", ["projectId", "status"])
      .index("by_project_priority", ["projectId", "priority"])
      .index("by_session", ["sessionId"])
      .searchIndex("search_text", {
        searchField: "searchText",
        filterFields: ["projectId", "status"],
      }),
    events: defineTable(vEvent)
      .index("by_project_createdAt", ["projectId", "createdAt"])
      .index("by_session_createdAt", ["sessionId", "createdAt"])
      .index("by_task_createdAt", ["taskId", "createdAt"]),
    notes: defineTable(vNote)
      .index("by_createdAt", ["createdAt"])
      .index("by_scope_createdAt", ["scope", "createdAt"])
      .index("by_project_createdAt", ["projectId", "createdAt"])
      .index("by_task_createdAt", ["taskId", "createdAt"])
      .searchIndex("search_body", {
        searchField: "body",
        filterFields: ["projectId", "scope"],
      }),
    proposals: defineTable(vProposal)
      .index("by_status", ["status"])
      .index("by_project_status", ["projectId", "status"])
      .searchIndex("search_text", {
        searchField: "searchText",
        filterFields: ["status"],
      }),
  },
  { schemaValidation: true },
);
