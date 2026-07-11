import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { hostname } from "node:os";
import { promisify } from "node:util";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/client";

import { getConvexSiteUrl } from "./config.ts";

const execFileAsync = promisify(execFile);
const KEYCHAIN_SERVICE = "com.bentsignal.uav.auth";
const DEVICE_EMAIL = "macbook@uav.invalid";

interface StoredCredential {
  accessToken: string;
  email: string;
  password: string;
  subject: string;
}

function authClient() {
  const baseURL = getConvexSiteUrl();
  return createAuthClient({
    baseURL,
    fetchOptions: { headers: { Origin: baseURL } },
    plugins: [convexClient()],
  });
}

function keychainAccount(): string {
  return new URL(getConvexSiteUrl()).hostname;
}

async function readCredential(): Promise<StoredCredential | undefined> {
  try {
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      keychainAccount(),
      "-w",
    ]);
    return JSON.parse(stdout.trim()) as StoredCredential;
  } catch {
    return undefined;
  }
}

async function writeCredential(credential: StoredCredential): Promise<void> {
  await execFileAsync("security", [
    "add-generic-password",
    "-U",
    "-s",
    KEYCHAIN_SERVICE,
    "-a",
    keychainAccount(),
    "-w",
    JSON.stringify(credential),
  ]);
}

async function deleteCredential(): Promise<void> {
  try {
    await execFileAsync("security", [
      "delete-generic-password",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      keychainAccount(),
    ]);
  } catch {
    // Logging out is idempotent when the device has no stored credential.
  }
}

function bearerHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function activeSession(credential: StoredCredential) {
  const result = await authClient().getSession({
    fetchOptions: { headers: bearerHeaders(credential.accessToken) },
  });
  return result.data?.user ? result.data : undefined;
}

async function renewSession(
  credential: StoredCredential,
): Promise<StoredCredential | undefined> {
  let accessToken: string | null = null;
  const result = await authClient().signIn.email(
    { email: credential.email, password: credential.password },
    {
      onSuccess: (ctx) => {
        accessToken = ctx.response.headers.get("set-auth-token");
      },
    },
  );
  if (result.error || !accessToken) return undefined;
  const renewed = { ...credential, accessToken };
  await writeCredential(renewed);
  return renewed;
}

async function usableCredential(): Promise<StoredCredential | undefined> {
  const credential = await readCredential();
  if (!credential) return undefined;
  if (await activeSession(credential)) return credential;
  return await renewSession(credential);
}

export async function getAuthToken(): Promise<string | undefined> {
  const credential = await usableCredential();
  if (!credential) return undefined;
  const { data, error } = await authClient().convex.token({
    fetchOptions: { headers: bearerHeaders(credential.accessToken) },
  });
  if (error || !data?.token) return undefined;
  return data.token;
}

export async function login(): Promise<{ subject: string }> {
  const existing = await usableCredential();
  if (existing) return { subject: existing.subject };

  const password = randomBytes(32).toString("base64url");
  let accessToken: string | null = null;
  const result = await authClient().signUp.email(
    {
      email: DEVICE_EMAIL,
      name: hostname(),
      password,
    },
    {
      onSuccess: (ctx) => {
        accessToken = ctx.response.headers.get("set-auth-token");
      },
    },
  );
  if (result.error || !result.data?.user.id || !accessToken) {
    throw new Error(
      result.error?.message ??
        "Unable to enroll this Mac. Device enrollment may be disabled.",
    );
  }

  const credential = {
    accessToken,
    email: DEVICE_EMAIL,
    password,
    subject: result.data.user.id,
  };
  await writeCredential(credential);
  return { subject: credential.subject };
}

export async function logout(): Promise<void> {
  const credential = await readCredential();
  if (credential) {
    await authClient().signOut({
      fetchOptions: { headers: bearerHeaders(credential.accessToken) },
    });
  }
  await deleteCredential();
}

export async function status(): Promise<{
  authenticated: boolean;
  configured: boolean;
  subject?: string;
}> {
  const credential = await usableCredential();
  if (!credential) return { authenticated: false, configured: true };
  const session = await activeSession(credential);
  return {
    authenticated: Boolean(session?.user),
    configured: true,
    subject: session?.user.id ?? credential.subject,
  };
}
