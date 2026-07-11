#!/usr/bin/env node
import { Command } from "commander";

import type { Id } from "@uav/convex/model";
import { api } from "@uav/convex/api";
import { toJson } from "@uav/std/json";

import {
  status as authStatus,
  login as loginDevice,
  logout as logoutDevice,
} from "./auth.ts";
import { getRepoContext } from "./context.ts";
import { createUavClient, ensureCurrentProject } from "./convex.ts";
import { ensureDaemonStarted, startDaemon } from "./daemon.ts";
import { readUavSkill, readUavWorkflow } from "./skill.ts";

interface JsonOptions {
  json?: boolean;
}

interface AskOptions {
  limit?: number;
}

interface NotesOptions {
  all?: boolean;
  global?: boolean;
  intent?: boolean;
  limit?: number;
}

interface RememberOptions {
  global?: boolean;
  intent?: boolean;
}

type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "canceled";
type TaskPriority = "low" | "normal" | "high" | "urgent";
type TaskKind = "task" | "bug" | "idea" | "chore" | "goal";

interface TaskAddOptions {
  body?: string;
  kind?: TaskKind;
  parent?: string;
  priority?: TaskPriority;
  tag?: string[];
}

interface TaskListOptions {
  parent?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}

interface TaskUpdateOptions {
  body?: string;
  kind?: TaskKind;
  priority?: TaskPriority;
  status?: TaskStatus;
  tag?: string[];
  title?: string;
}

function print(value: unknown, options: JsonOptions): void {
  if (options.json) {
    process.stdout.write(toJson(value));
    return;
  }

  if (typeof value === "string") {
    console.log(value);
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

function collect(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function memoryWarning(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("OPENAI_API_KEY")) {
    return "Memory indexing requires OPENAI_API_KEY in the Convex deployment environment.";
  }

  return message;
}

async function runStatus(options: JsonOptions): Promise<void> {
  const client = await createUavClient();
  const { context, projectId } = await ensureCurrentProject(client);
  const [activeTasks, blockedTasks] = await Promise.all([
    client.query(api.tasks.queries.listForProject, {
      projectId,
      status: "in_progress",
    }),
    client.query(api.tasks.queries.listForProject, {
      projectId,
      status: "blocked",
    }),
  ]);

  print(
    {
      activeTasks,
      blockedTasks,
      project: context,
    },
    options,
  );
}

async function runRemember(
  message: string,
  commandOptions: RememberOptions,
  options: JsonOptions,
): Promise<void> {
  const client = await createUavClient();

  if (commandOptions.global) {
    const noteId = await client.mutation(api.notes.mutations.create, {
      body: message,
      kind: commandOptions.intent ? "intent" : "note",
      scope: "global",
    });

    print({ noteId, ok: true, scope: "global" }, options);
    return;
  }

  const { projectId } = await ensureCurrentProject(client);
  const noteId = await client.mutation(api.notes.mutations.create, {
    body: message,
    kind: commandOptions.intent ? "intent" : "note",
    projectId,
    scope: "project",
  });

  try {
    const memory = await client.action(api.memory.indexNote, { noteId });
    print({ memory, noteId, ok: true, scope: "project" }, options);
  } catch (error) {
    print(
      {
        memory: { indexed: false, warning: memoryWarning(error) },
        noteId,
        ok: true,
        scope: "project",
      },
      options,
    );
  }
}

async function runIdea(message: string, options: JsonOptions): Promise<void> {
  const client = await createUavClient();
  const noteId = await client.mutation(api.notes.mutations.create, {
    body: message,
    kind: "idea",
    scope: "global",
  });

  print({ noteId, ok: true, scope: "global" }, options);
}

async function runNotes(
  query: string | undefined,
  commandOptions: NotesOptions,
  options: JsonOptions,
): Promise<void> {
  const client = await createUavClient();

  if (commandOptions.all && commandOptions.global) {
    throw new Error("Use either --all or --global, not both");
  }

  if (commandOptions.all) {
    const notes = await client.query(api.notes.queries.listAll, {
      limit: commandOptions.limit,
      query,
    });

    print({ notes, scope: "all" }, options);
    return;
  }

  if (commandOptions.global) {
    const notes = await client.query(api.notes.queries.listGlobal, {
      limit: commandOptions.limit,
      query,
    });

    print({ notes, scope: "global" }, options);
    return;
  }

  const { context, projectId } = await ensureCurrentProject(client);
  const notes = await client.query(api.notes.queries.listForProject, {
    kind: commandOptions.intent ? "intent" : undefined,
    limit: commandOptions.limit,
    projectId,
    query,
  });

  print({ notes, project: context }, options);
}

async function runIntent(
  message: string | undefined,
  options: JsonOptions,
): Promise<void> {
  const client = await createUavClient();

  if (message) {
    const { projectId } = await ensureCurrentProject(client);
    const noteId = await client.mutation(api.notes.mutations.create, {
      body: message,
      kind: "intent",
      projectId,
      scope: "project",
    });

    try {
      const memory = await client.action(api.memory.indexNote, { noteId });
      print({ memory, noteId, ok: true, scope: "project" }, options);
    } catch (error) {
      print(
        {
          memory: { indexed: false, warning: memoryWarning(error) },
          noteId,
          ok: true,
          scope: "project",
        },
        options,
      );
    }
    return;
  }

  const { context, projectId } = await ensureCurrentProject(client);
  const notes = await client.query(api.notes.queries.listForProject, {
    kind: "intent",
    limit: 25,
    projectId,
  });

  print({ notes, project: context }, options);
}

async function runAsk(
  question: string,
  commandOptions: AskOptions,
  options: JsonOptions,
): Promise<void> {
  const client = await createUavClient();
  const { context, projectId } = await ensureCurrentProject(client);
  const memory = await client.action(api.memory.indexProject, {
    limit: 100,
    projectId,
  });
  const result = await client.action(api.memory.ask, {
    limit: commandOptions.limit,
    projectId,
    query: question,
  });

  print({ memory, project: context, question, result }, options);
}

function parseTaskId(value: string): Id<"tasks"> {
  return value as Id<"tasks">;
}

async function runTaskAdd(
  title: string,
  commandOptions: TaskAddOptions,
  options: JsonOptions,
): Promise<void> {
  const client = await createUavClient();
  const { projectId } = await ensureCurrentProject(client);
  const taskId = await client.mutation(api.tasks.mutations.create, {
    body: commandOptions.body,
    kind: commandOptions.kind,
    parentTaskId: commandOptions.parent
      ? parseTaskId(commandOptions.parent)
      : undefined,
    priority: commandOptions.priority,
    projectId,
    tags: commandOptions.tag,
    title,
  });

  try {
    const memory = await client.action(api.memory.indexTask, { taskId });
    print({ memory, ok: true, taskId }, options);
  } catch (error) {
    print(
      {
        memory: { indexed: false, warning: memoryWarning(error) },
        ok: true,
        taskId,
      },
      options,
    );
  }
}

async function runTaskList(
  query: string | undefined,
  commandOptions: TaskListOptions,
  options: JsonOptions,
): Promise<void> {
  const client = await createUavClient();
  const { context, projectId } = await ensureCurrentProject(client);
  const tasks = await client.query(api.tasks.queries.listForProject, {
    parentTaskId: commandOptions.parent
      ? parseTaskId(commandOptions.parent)
      : undefined,
    priority: commandOptions.priority,
    projectId,
    query,
    status: commandOptions.status,
  });

  print({ project: context, tasks }, options);
}

async function runTaskStatus(
  taskId: string,
  status: TaskStatus,
  options: JsonOptions,
): Promise<void> {
  const client = await createUavClient();
  await client.mutation(api.tasks.mutations.updateStatus, {
    status,
    taskId: parseTaskId(taskId),
  });

  try {
    const memory = await client.action(api.memory.indexTask, {
      taskId: parseTaskId(taskId),
    });
    print({ memory, ok: true, status, taskId }, options);
  } catch (error) {
    print(
      {
        memory: { indexed: false, warning: memoryWarning(error) },
        ok: true,
        status,
        taskId,
      },
      options,
    );
  }
}

async function runTaskUpdate(
  taskId: string,
  commandOptions: TaskUpdateOptions,
  options: JsonOptions,
): Promise<void> {
  const client = await createUavClient();
  await client.mutation(api.tasks.mutations.update, {
    body: commandOptions.body,
    kind: commandOptions.kind,
    priority: commandOptions.priority,
    status: commandOptions.status,
    tags: commandOptions.tag,
    taskId: parseTaskId(taskId),
    title: commandOptions.title,
  });

  try {
    const memory = await client.action(api.memory.indexTask, {
      taskId: parseTaskId(taskId),
    });
    print({ memory, ok: true, taskId }, options);
  } catch (error) {
    print(
      {
        memory: { indexed: false, warning: memoryWarning(error) },
        ok: true,
        taskId,
      },
      options,
    );
  }
}

async function runRequest(
  message: string,
  options: JsonOptions,
): Promise<void> {
  const client = await createUavClient();
  const { projectId } = await ensureCurrentProject(client);
  const proposalId = await client.mutation(api.proposals.mutations.create, {
    body: message,
    kind: "capability",
    projectId,
    title: message.slice(0, 80),
  });

  print({ ok: true, proposalId }, options);
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("uav")
    .description("Project memory and work tracking for local codebases")
    .option("--json", "print machine-readable JSON")
    .addHelpText(
      "after",
      `
Common flow:
  uav ask <question>       retrieve relevant project memory
  uav status               inspect current work
  uav remember <message>   preserve durable context
  uav task <command>       manage structured work items

Less common commands are still shown above for discovery, but the normal agent
flow should start with ask/status/remember/task.
`,
    );

  if (process.argv.length <= 2) {
    program.help();
  }

  program
    .command("context")
    .description("print the detected git/project context")
    .action(() => {
      print(getRepoContext(), program.opts<JsonOptions>());
    });

  const auth = program
    .command("auth")
    .description("manage this device's UAV authentication");

  auth
    .command("login")
    .description("authorize this Mac to access UAV")
    .action(async () => {
      const result = await loginDevice();
      print(
        { authenticated: true, subject: result.subject },
        program.opts<JsonOptions>(),
      );
    });

  auth
    .command("status")
    .description("show this device's authentication status")
    .action(async () => {
      print(await authStatus(), program.opts<JsonOptions>());
    });

  auth
    .command("logout")
    .description("remove this device's stored UAV credential")
    .action(async () => {
      await logoutDevice();
      print({ authenticated: false }, program.opts<JsonOptions>());
    });

  program
    .command("status")
    .description("show current project work from uav")
    .action(async () => {
      await runStatus(program.opts<JsonOptions>());
    });

  program
    .command("ask")
    .description("search current project memory with natural language")
    .argument("<question...>")
    .option("--limit <limit>", "maximum memory results to retrieve", Number)
    .action(async (question: string[], commandOptions: AskOptions) => {
      await runAsk(
        question.join(" "),
        commandOptions,
        program.opts<JsonOptions>(),
      );
    });

  program
    .command("remember")
    .description(
      "store a note for the current project, or globally with --global",
    )
    .argument("<message...>")
    .option("-g, --global", "store the note in the global inbox")
    .option("--intent", "mark the note as durable project intent")
    .action(async (message: string[], commandOptions: RememberOptions) => {
      await runRemember(
        message.join(" "),
        commandOptions,
        program.opts<JsonOptions>(),
      );
    });

  program
    .command("idea")
    .description("store a one-off global idea")
    .argument("<message...>")
    .action(async (message: string[]) => {
      await runIdea(message.join(" "), program.opts<JsonOptions>());
    });

  program
    .command("notes")
    .description("show recent notes for the current project")
    .argument("[query...]", "optional text to search for")
    .option("-g, --global", "show global inbox notes")
    .option("-a, --all", "show notes across every scope")
    .option("--intent", "show durable project intent notes")
    .option("--limit <limit>", "maximum notes to show", Number)
    .action(async (query: string[], commandOptions: NotesOptions) => {
      await runNotes(
        query.length > 0 ? query.join(" ") : undefined,
        commandOptions,
        program.opts<JsonOptions>(),
      );
    });

  program
    .command("intent")
    .description("show or store durable intent for the current project")
    .argument("[message...]", "intent to store; omit to list saved intent")
    .action(async (message: string[]) => {
      await runIntent(
        message.length > 0 ? message.join(" ") : undefined,
        program.opts<JsonOptions>(),
      );
    });

  const task = program
    .command("task")
    .description("manage durable project work items");

  task
    .command("add")
    .description("add a project work item")
    .argument("<title...>")
    .option("--body <body>", "longer task details")
    .option("--kind <kind>", "task, bug, idea, chore, or goal")
    .option("--parent <taskId>", "parent work item id")
    .option("--priority <priority>", "low, normal, high, or urgent")
    .option("--tag <tag>", "tag to attach; can be repeated", collect)
    .action(async (title: string[], commandOptions: TaskAddOptions) => {
      await runTaskAdd(
        title.join(" "),
        commandOptions,
        program.opts<JsonOptions>(),
      );
    });

  task
    .command("list")
    .description("list or search project work items")
    .argument("[query...]", "optional text to search for")
    .option("--parent <taskId>", "only show children of a work item")
    .option("--priority <priority>", "low, normal, high, or urgent")
    .option("--status <status>", "todo, in_progress, blocked, done, canceled")
    .action(async (query: string[], commandOptions: TaskListOptions) => {
      await runTaskList(
        query.length > 0 ? query.join(" ") : undefined,
        commandOptions,
        program.opts<JsonOptions>(),
      );
    });

  task
    .command("status")
    .description("update a work item status")
    .argument("<taskId>")
    .argument("<status>")
    .action(async (taskId: string, status: TaskStatus) => {
      await runTaskStatus(taskId, status, program.opts<JsonOptions>());
    });

  task
    .command("update")
    .description("update work item fields")
    .argument("<taskId>")
    .option("--body <body>", "replace task details")
    .option("--kind <kind>", "task, bug, idea, chore, or goal")
    .option("--priority <priority>", "low, normal, high, or urgent")
    .option("--status <status>", "todo, in_progress, blocked, done, canceled")
    .option("--tag <tag>", "replace tags; can be repeated", collect)
    .option("--title <title>", "replace title")
    .action(async (taskId: string, commandOptions: TaskUpdateOptions) => {
      await runTaskUpdate(taskId, commandOptions, program.opts<JsonOptions>());
    });

  program
    .command("request")
    .description("ask uav for a capability or schema change")
    .argument("<message...>")
    .action(async (message: string[]) => {
      await runRequest(message.join(" "), program.opts<JsonOptions>());
    });

  program
    .command("skill")
    .description("print the durable uav agent skill text")
    .action(async () => {
      process.stdout.write(await readUavSkill());
    });

  program
    .command("workflow")
    .description("print current guidance for using uav during agent work")
    .action(async () => {
      process.stdout.write(await readUavWorkflow());
    });

  program
    .command("start")
    .description("start the local uav daemon if it is not already running")
    .option("--port <port>", "port to bind", Number)
    .action(async (options: { port?: number }) => {
      await ensureDaemonStarted(options.port);
    });

  program
    .command("daemon")
    .description("start the local uav daemon boundary")
    .option("--port <port>", "port to bind", Number)
    .action(async (options: { port?: number }) => {
      await startDaemon(options.port);
    });

  await program.parseAsync();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
