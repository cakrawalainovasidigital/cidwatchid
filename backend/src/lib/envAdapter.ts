/**
 * Universal Environment Adapter
 * Works on both Cloudflare Workers and VPS (Node.js/Bun)
 */

import type { Context } from "hono";

// Detect environment
declare global {
  var ENVIRONMENT: string | undefined;
}

export type EnvironmentType = "workers" | "vps" | "unknown";

/**
 * Detect current environment
 */
export function detectEnvironment(): EnvironmentType {
  // Check for Cloudflare Workers FIRST
  // With nodejs_compat flag, workerd also has process.versions.node,
  // so we must detect Workers before checking for Node.js/Bun.
  // navigator.userAgent is "Cloudflare-Workers" in workerd runtime.
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  ) {
    return "workers";
  }

  // Check if running in Bun (VPS)
  if (typeof Bun !== "undefined") {
    return "vps";
  }

  // Check if running in Node.js (VPS)
  if (typeof process !== "undefined" && (process.versions?.node || process.versions?.bun)) {
    return "vps";
  }

  // Fallback: check for Workers via WebSocketPair + caches
  if (typeof caches !== "undefined" && typeof WebSocketPair !== "undefined") {
    return "workers";
  }

  return "unknown";
}

/**
 * Check if running in Cloudflare Workers
 */
export function isWorkers(): boolean {
  return detectEnvironment() === "workers";
}

/**
 * Check if running in VPS (Node.js/Bun)
 */
export function isVPS(): boolean {
  return detectEnvironment() === "vps";
}

/**
 * Get environment variable
 * Works on both Workers and VPS
 */
export function getEnv(
  c: Context | null,
  key: keyof Env,
  defaultValue?: string
): string | undefined {
  // Try Workers way first (if context available)
  if (c && isWorkers()) {
    const workersEnv = c.env as Record<string, string>;
    const value = workersEnv[key as string];
    if (value !== undefined) return value;
  }

  // Try VPS way (process.env)
  if (isVPS() && typeof process !== "undefined") {
    const value = process.env[key as string];
    if (value !== undefined) return value;
  }

  // Fallback to global ENVIRONMENT object
  if (typeof globalThis !== "undefined") {
    const globalEnv = (globalThis as any).ENV as Record<string, string> | undefined;
    if (globalEnv && key in globalEnv) {
      return globalEnv[key as string];
    }
  }

  return defaultValue;
}

/**
 * Get all environment variables as object
 */
export function getAllEnv(c?: Context): Partial<Env> {
  const env: Partial<Env> = {};

  const keys: (keyof Env)[] = [
    "BASE_URL_V1",
    "BASE_URL_V2",
    "BASE_URL_V3",
    "DATABASE_URL",
    "HASH_SALT",
    "HASH_SCRET_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "FRONTEND_URL",
  ];

  for (const key of keys) {
    const value = getEnv(c || null, key);
    if (value !== undefined) {
      (env as any)[key] = value;
    }
  }

  return env;
}

/**
 * Validate required environment variables
 */
export function validateEnv(c?: Context): { valid: boolean; missing: string[] } {
  const required: (keyof Env)[] = [
    "DATABASE_URL",
    "HASH_SALT",
    "HASH_SCRET_KEY",
  ];

  const missing: string[] = [];

  for (const key of required) {
    const value = getEnv(c || null, key);
    if (!value) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get base URL based on environment
 */
export function getBaseUrl(
  c: Context | null,
  version: 1 | 2 | 3 = 1
): string {
  const key = `BASE_URL_V${version}` as keyof Env;
  const defaultUrls: Record<number, string> = {
    1: "https://ramzapi.vercel.app",
    2: "https://dramabos.asia",
    3: "https://rebahin-api.vercel.app",
  };

  return getEnv(c, key) || defaultUrls[version];
}

/**
 * Environment info for debugging
 */
export function getEnvironmentInfo(): {
  type: EnvironmentType;
  isWorkers: boolean;
  isVPS: boolean;
  runtime: string;
  version: string;
} {
  const type = detectEnvironment();

  let runtime = "unknown";
  let version = "unknown";

  if (typeof Bun !== "undefined") {
    runtime = "bun";
    version = Bun.version;
  } else if (typeof process !== "undefined") {
    runtime = process.versions?.bun ? "bun" : "node";
    version = process.versions?.bun || process.versions?.node || "unknown";
  }

  return {
    type,
    isWorkers: type === "workers",
    isVPS: type === "vps",
    runtime,
    version,
  };
}

/**
 * Hono middleware to attach environment helpers
 */
export function envAdapterMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    // Attach helper functions to context
    c.set("getEnv", (key: keyof Env, defaultValue?: string) =>
      getEnv(c, key, defaultValue)
    );
    c.set("isWorkers", isWorkers());
    c.set("isVPS", isVPS());
    c.set("envInfo", getEnvironmentInfo());

    await next();
  };
}

// Extend Hono Context types
declare module "hono" {
  interface ContextVariableMap {
    getEnv: (key: keyof Env, defaultValue?: string) => string | undefined;
    isWorkers: boolean;
    isVPS: boolean;
    envInfo: ReturnType<typeof getEnvironmentInfo>;
  }
}
