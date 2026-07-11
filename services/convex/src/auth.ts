import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import type { BetterAuthOptions } from "better-auth/minimal";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { bearer } from "better-auth/plugins/bearer";

import type { DataModel } from "./_generated/dataModel";
import { components, internal } from "./_generated/api";
import authConfig from "./auth.config";

// eslint-disable-next-line no-restricted-syntax -- This preserves Better Auth's generated Convex API typing.
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {},
});

function requiredEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string" || !value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function siteUrl() {
  return requiredEnv("CONVEX_SITE_URL");
}

export function createAuthOptions(ctx: GenericCtx<DataModel>) {
  return {
    appName: "UAV",
    baseURL: siteUrl(),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      autoSignIn: true,
      disableSignUp: requiredEnv("UAV_ALLOW_DEVICE_ENROLLMENT") !== "true",
      enabled: true,
    },
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    session: {
      expiresIn: 60 * 60 * 24 * 365,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: [siteUrl()],
    plugins: [bearer(), convex({ authConfig })],
  } satisfies BetterAuthOptions;
}

export function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth(createAuthOptions(ctx));
}

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
