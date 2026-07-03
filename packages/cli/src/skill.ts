import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function readUavSkill() {
  return await readFile(
    resolve(import.meta.dirname, "../../../.agents/skills/uav/SKILL.md"),
    "utf8",
  );
}

export async function readUavWorkflow() {
  return await readFile(
    resolve(import.meta.dirname, "../../../.agents/skills/uav/WORKFLOW.md"),
    "utf8",
  );
}
