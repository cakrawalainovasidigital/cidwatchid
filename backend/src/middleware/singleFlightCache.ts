import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";

type CacheEntry = {
  expiresAt: number;
  response: Response;
};

type SingleFlightCacheOptions = {
  ttlSeconds?: number;
  key?: (c: Context) => string;
  allowedMethods?: string[];
  cacheErrors?: boolean;
};

const responseCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Response>>();

const defaultKey = (c: Context) => {
  const url = new URL(c.req.url);
  url.searchParams.sort();
  return `${c.req.method.toUpperCase()}:${url.pathname}?${url.searchParams.toString()}`;
};

const shouldCacheResponse = (res: Response, cacheErrors: boolean) => {
  if (cacheErrors) return true;
  return res.ok;
};

export const singleFlightCache = (options: SingleFlightCacheOptions = {}) =>
  createMiddleware(async (c: Context, next: Next) => {
    const allowed = options.allowedMethods ?? ["GET", "HEAD"];
    const method = c.req.method.toUpperCase();
    if (!allowed.includes(method)) {
      return next();
    }

    const ttlMs = Math.max(0, (options.ttlSeconds ?? 30) * 1000);
    if (ttlMs === 0) {
      return next();
    }

    const keyBuilder = options.key ?? defaultKey;
    const key = keyBuilder(c);
    const now = Date.now();

    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.response.clone();
    }

    const existing = inflight.get(key);
    if (existing) {
      const reused = await existing;
      return reused ? reused.clone() : reused;
    }

    const run = (async () => {
      try {
        await next();
        const res = c.res;
        if (!res) return res;
        const reusable = res.clone();
        if (shouldCacheResponse(res, Boolean(options.cacheErrors))) {
          responseCache.set(key, {
            expiresAt: Date.now() + ttlMs,
            response: reusable.clone(),
          });
        }
        return reusable;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, run);
    const result = await run;
    return result ? result.clone() : result;
  });

export const singleFlightCacheShort = (ttlSeconds = 30) =>
  singleFlightCache({ ttlSeconds });

export const singleFlightCacheLong = (ttlSeconds = 300) =>
  singleFlightCache({ ttlSeconds });
