import type { CustomCtx } from "convex-helpers/server/customFunctions";
import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { ConvexError } from "convex/values";

import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { action, mutation, query } from "./_generated/server";

type PublicFunctionCtx = ActionCtx | MutationCtx | QueryCtx;

async function requireOwner(ctx: PublicFunctionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const enforceAuth = process.env.UAV_ENFORCE_AUTH === "true";
  if (!enforceAuth) return identity;
  if (!identity) throw new ConvexError("Unauthenticated");

  const ownerSubject = process.env.UAV_OWNER_SUBJECT;
  if (typeof ownerSubject !== "string" || !ownerSubject) {
    throw new ConvexError("UAV owner is not configured");
  }
  if (identity.subject !== ownerSubject) throw new ConvexError("Forbidden");

  return identity;
}

export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ identity: await requireOwner(ctx) })),
);

export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ identity: await requireOwner(ctx) })),
);

export const authedAction = customAction(
  action,
  customCtx(async (ctx) => ({ identity: await requireOwner(ctx) })),
);

export type AuthedQueryCtx = CustomCtx<typeof authedQuery>;
export type AuthedMutationCtx = CustomCtx<typeof authedMutation>;
export type AuthedActionCtx = CustomCtx<typeof authedAction>;
