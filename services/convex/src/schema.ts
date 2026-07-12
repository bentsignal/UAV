import { defineSchema, defineTable } from "convex/server";

import { vMemoryEmbedding } from "./memory/validators";
import { vNote } from "./notes/validators";
import { vProject } from "./projects/validators";
import { vProposal } from "./proposals/validators";
import { vTaskClaim } from "./taskClaims/validators";
import { vTask } from "./tasks/validators";

export default defineSchema(
  {
    projects: defineTable(vProject)
      .index("by_repoRoot", ["repoRoot"])
      .index("by_remoteUrl", ["remoteUrl"])
      .searchIndex("search_name", { searchField: "searchText" }),
    tasks: defineTable(vTask)
      .index("by_project_status", ["projectId", "status"])
      .index("by_project_priority", ["projectId", "priority"])
      .index("by_parent_status", ["parentTaskId", "status"])
      .searchIndex("search_text", {
        searchField: "searchText",
        filterFields: ["projectId", "status"],
      }),
    taskClaims: defineTable(vTaskClaim)
      .index("by_run_status", ["runId", "status"])
      .index("by_task_status", ["taskId", "status"]),
    notes: defineTable(vNote)
      .index("by_createdAt", ["createdAt"])
      .index("by_scope_createdAt", ["scope", "createdAt"])
      .index("by_project_createdAt", ["projectId", "createdAt"])
      .index("by_task_createdAt", ["taskId", "createdAt"])
      .searchIndex("search_body", {
        searchField: "body",
        filterFields: ["projectId", "scope"],
      }),
    memoryEmbeddings: defineTable(vMemoryEmbedding)
      .index("by_note", ["noteId"])
      .index("by_task", ["taskId"])
      .index("by_project_source", ["projectId", "sourceType"])
      .vectorIndex("by_embedding", {
        vectorField: "embedding",
        dimensions: 1024,
        filterFields: ["projectId"],
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
