#!/usr/bin/env node
import { Command } from "commander";

import { api } from "@uav/convex/api";
import { toJson } from "@uav/std/json";

import { getRepoContext } from "./context.ts";
import {
  createUavClient,
  ensureCurrentAgent,
  ensureCurrentProject,
} from "./convex.ts";
import { ensureDaemonStarted, startDaemon } from "./daemon.ts";
import { readUavSkill, readUavWorkflow } from "./skill.ts";

interface JsonOptions {
  json?: boolean;
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

async function runStatus(options: JsonOptions): Promise<void> {
  const client = createUavClient();
  const { context, projectId } = await ensureCurrentProject(client);
  const [activeSessions, recentEvents, activeTasks, blockedTasks] =
    await Promise.all([
      client.query(api.sessions.queries.activeForProject, { projectId }),
      client.query(api.events.queries.recentForProject, {
        limit: 10,
        projectId,
      }),
      client.query(api.tasks.queries.listForProject, {
        projectId,
        status: "active",
      }),
      client.query(api.tasks.queries.listForProject, {
        projectId,
        status: "blocked",
      }),
    ]);

  print(
    {
      activeSessions,
      activeTasks,
      blockedTasks,
      project: context,
      recentEvents,
    },
    options,
  );
}

async function runReport(message: string, options: JsonOptions): Promise<void> {
  const client = createUavClient();
  const [{ projectId }, agentId] = await Promise.all([
    ensureCurrentProject(client),
    ensureCurrentAgent(client),
  ]);
  const eventId = await client.mutation(api.events.mutations.create, {
    agentId,
    projectId,
    summary: message,
  });

  print({ eventId, ok: true }, options);
}

async function runRemember(
  message: string,
  options: JsonOptions,
): Promise<void> {
  const client = createUavClient();
  const [{ projectId }, agentId] = await Promise.all([
    ensureCurrentProject(client),
    ensureCurrentAgent(client),
  ]);
  const noteId = await client.mutation(api.notes.mutations.create, {
    agentId,
    body: message,
    projectId,
  });

  print({ noteId, ok: true }, options);
}

async function runRequest(
  message: string,
  options: JsonOptions,
): Promise<void> {
  const client = createUavClient();
  const [{ projectId }, agentId] = await Promise.all([
    ensureCurrentProject(client),
    ensureCurrentAgent(client),
  ]);
  const proposalId = await client.mutation(api.proposals.mutations.create, {
    agentId,
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
    .description("Agent coordination for local codebases")
    .option("--json", "print machine-readable JSON");

  if (process.argv.length <= 2) {
    program.help();
  }

  program
    .command("context")
    .description("print the detected git/project context")
    .action(() => {
      print(getRepoContext(), program.opts<JsonOptions>());
    });

  program
    .command("status")
    .description("show current project activity from uav")
    .action(async () => {
      await runStatus(program.opts<JsonOptions>());
    });

  program
    .command("report")
    .description("append a progress report event")
    .argument("<message...>")
    .action(async (message: string[]) => {
      await runReport(message.join(" "), program.opts<JsonOptions>());
    });

  program
    .command("remember")
    .description("store a loose note for the current project")
    .argument("<message...>")
    .action(async (message: string[]) => {
      await runRemember(message.join(" "), program.opts<JsonOptions>());
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
