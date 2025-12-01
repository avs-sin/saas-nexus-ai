/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as helpers_intelligenceHelpers from "../helpers/intelligenceHelpers.js";
import type * as helpers_tenantScope from "../helpers/tenantScope.js";
import type * as nexusInbound from "../nexusInbound.js";
import type * as nexusInboundActions from "../nexusInboundActions.js";
import type * as nexusIntelligence from "../nexusIntelligence.js";
import type * as nexusOutbound from "../nexusOutbound.js";
import type * as nexusOutboundActions from "../nexusOutboundActions.js";
import type * as nexusOutboundMutations from "../nexusOutboundMutations.js";
import type * as nexusProduction from "../nexusProduction.js";
import type * as nexusProductionActions from "../nexusProductionActions.js";
import type * as nexusplan from "../nexusplan.js";
import type * as tenants from "../tenants.js";
import type * as users from "../users.js";
import type * as warehouses from "../warehouses.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  "helpers/intelligenceHelpers": typeof helpers_intelligenceHelpers;
  "helpers/tenantScope": typeof helpers_tenantScope;
  nexusInbound: typeof nexusInbound;
  nexusInboundActions: typeof nexusInboundActions;
  nexusIntelligence: typeof nexusIntelligence;
  nexusOutbound: typeof nexusOutbound;
  nexusOutboundActions: typeof nexusOutboundActions;
  nexusOutboundMutations: typeof nexusOutboundMutations;
  nexusProduction: typeof nexusProduction;
  nexusProductionActions: typeof nexusProductionActions;
  nexusplan: typeof nexusplan;
  tenants: typeof tenants;
  users: typeof users;
  warehouses: typeof warehouses;
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
