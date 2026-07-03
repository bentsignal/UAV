import { spawn } from "node:child_process";
import { createServer } from "node:http";

import { DEFAULT_DAEMON_HOST, DEFAULT_DAEMON_PORT } from "@uav/config/runtime";

export async function isDaemonRunning(port = DEFAULT_DAEMON_PORT) {
  try {
    const response = await fetch(
      `http://${DEFAULT_DAEMON_HOST}:${port}/health`,
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureDaemonStarted(port = DEFAULT_DAEMON_PORT) {
  if (await isDaemonRunning(port)) {
    console.log(`UAV daemon already running on port ${port}`);
    return;
  }

  const subprocess = spawn(
    process.execPath,
    [
      "--experimental-strip-types",
      "src/index.ts",
      "daemon",
      "--port",
      `${port}`,
    ],
    {
      cwd: import.meta.dirname.replace(/\/src$/, ""),
      detached: true,
      stdio: "ignore",
    },
  );
  subprocess.unref();

  if (!(await waitForDaemon(port))) {
    throw new Error(
      "UAV daemon did not start before the health check timeout.",
    );
  }

  console.log(`UAV daemon started on port ${port}`);
}

export async function startDaemon(port = DEFAULT_DAEMON_PORT): Promise<void> {
  if (await isDaemonRunning(port)) {
    console.log(`UAV daemon already running on port ${port}`);
    return;
  }

  const server = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, service: "uav-daemon" }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, DEFAULT_DAEMON_HOST, resolve);
  });

  console.log(`UAV daemon listening on http://${DEFAULT_DAEMON_HOST}:${port}`);
}

async function waitForDaemon(port: number) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await isDaemonRunning(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}
