/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_mutations from "../agents/mutations.js";
import type * as agents_validators from "../agents/validators.js";
import type * as events_mutations from "../events/mutations.js";
import type * as events_queries from "../events/queries.js";
import type * as events_validators from "../events/validators.js";
import type * as notes_mutations from "../notes/mutations.js";
import type * as notes_queries from "../notes/queries.js";
import type * as notes_validators from "../notes/validators.js";
import type * as projects_mutations from "../projects/mutations.js";
import type * as projects_queries from "../projects/queries.js";
import type * as projects_validators from "../projects/validators.js";
import type * as proposals_mutations from "../proposals/mutations.js";
import type * as proposals_queries from "../proposals/queries.js";
import type * as proposals_validators from "../proposals/validators.js";
import type * as sessions_mutations from "../sessions/mutations.js";
import type * as sessions_queries from "../sessions/queries.js";
import type * as sessions_validators from "../sessions/validators.js";
import type * as tasks_mutations from "../tasks/mutations.js";
import type * as tasks_queries from "../tasks/queries.js";
import type * as tasks_validators from "../tasks/validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/mutations": typeof agents_mutations;
  "agents/validators": typeof agents_validators;
  "events/mutations": typeof events_mutations;
  "events/queries": typeof events_queries;
  "events/validators": typeof events_validators;
  "notes/mutations": typeof notes_mutations;
  "notes/queries": typeof notes_queries;
  "notes/validators": typeof notes_validators;
  "projects/mutations": typeof projects_mutations;
  "projects/queries": typeof projects_queries;
  "projects/validators": typeof projects_validators;
  "proposals/mutations": typeof proposals_mutations;
  "proposals/queries": typeof proposals_queries;
  "proposals/validators": typeof proposals_validators;
  "sessions/mutations": typeof sessions_mutations;
  "sessions/queries": typeof sessions_queries;
  "sessions/validators": typeof sessions_validators;
  "tasks/mutations": typeof tasks_mutations;
  "tasks/queries": typeof tasks_queries;
  "tasks/validators": typeof tasks_validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
