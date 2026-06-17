/**
 * Universal Cache Middleware
 * Works on both Cloudflare Workers (Cache API) and VPS (Memory Cache)
 * 
 * Usage:
 *   import { universalCache } from '../middleware/universalCache';
 *   
 *   // Basic usage (default 5 minutes TTL)
 *   app.get('/endpoint', universalCache(), handler);
 *   
 *   // With custom TTL
 *   app.get('/endpoint', universalCache({ ttlSeconds: 300 }), handler);
 *   
 *   // With custom cache name (Workers only)
 *   app.get('/endpoint', universalCache({ cacheName: 'my-cache', ttlSeconds: 600 }), handler);
 */

import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { isWorkers, isVPS } from "../lib/envAdapter";

interface CacheEntry {
  body: Uint8Array;
  status: number;
  headers: Record<string, string>;
  expiresAt: number;
}

interface UniversalCacheOptions {
  /** Cache name (Workers only) */
  cacheName?: string;
  /** TTL in seconds (default: 300 = 5 minutes) */
  ttlSeconds?: number;
  /** Cache-Control header value */
  cacheControl?: string;
  /** Only cache successful responses (2xx) */
  cacheSuccessOnly?: boolean;
  /** Custom key generator */
  keyGenerator?: (c: Context) => string;
  /** Skip caching for these paths (array of regex strings) */
  skipPaths?: string[];
}

// Memory cache store for VPS
const memoryCache = new Map<string, CacheEntry>();

// Default options
const defaultOptions: UniversalCacheOptions = {
  ttlSeconds: 300, // 5 minutes
  cacheSuccessOnly: true,
};

/**
 * Generate cache key from request
 */
function generateCacheKey(c: Context, customKey?: (c: Context) => string): string {
  if (customKey) {
    return customKey(c);
  }
  
  const url = new URL(c.req.url);
  url.searchParams.sort();
  return `${c.req.method}:${url.pathname}?${url.searchParams.toString()}`;
}

/**
 * Check if request should skip cache
 */
function shouldSkipCache(c: Context, skipPaths?: string[]): boolean {
  // Skip non-GET/HEAD requests
  const method = c.req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return true;
  }
  
  // Skip specific paths
  if (skipPaths && skipPaths.length > 0) {
    const pathname = new URL(c.req.url).pathname;
    for (const pattern of skipPaths) {
      const regex = new RegExp(pattern);
      if (regex.test(pathname)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Clean expired entries from memory cache (VPS only)
 * Run periodically to prevent memory leak
 */
export function cleanExpiredCache(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Clear all memory cache (VPS only)
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Get memory cache stats (VPS only)
 */
export function getMemoryCacheStats(): {
  size: number;
  keys: string[];
  totalSize: number;
} {
  let totalSize = 0;
  for (const entry of memoryCache.values()) {
    totalSize += entry.body.length;
  }
  
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys()).slice(0, 100), // Limit keys returned
    totalSize,
  };
}

/**
 * Universal Cache Middleware
 * Automatically chooses Workers Cache API or VPS Memory Cache
 */
export function universalCache(options: UniversalCacheOptions = {}) {
  const opts = { ...defaultOptions, ...options };
  
  return createMiddleware(async (c: Context, next: Next) => {
    // Skip caching if needed
    if (shouldSkipCache(c, opts.skipPaths)) {
      return next();
    }
    
    const cacheKey = generateCacheKey(c, opts.keyGenerator);
    const now = Date.now();
    
    // Workers: Use Cache API
    if (isWorkers()) {
      return handleWorkersCache(c, next, cacheKey, opts);
    }
    
    // VPS: Use Memory Cache
    return handleMemoryCache(c, next, cacheKey, opts, now);
  });
}

/**
 * Handle caching for Workers (Cache API)
 */
async function handleWorkersCache(
  c: Context,
  next: Next,
  cacheKey: string,
  opts: UniversalCacheOptions
): Promise<Response | void> {
  // Check if caches API is available
  if (typeof caches === "undefined") {
    console.log("[Cache] Workers detected but caches API not available");
    return next();
  }
  
  try {
    const cache = await caches.open(opts.cacheName || "universal-cache-v1");
    const request = new Request(c.req.url);
    
    // Try to get cached response
    const cached = await cache.match(request);
    if (cached) {
      console.log(`[Cache] Hit (Workers): ${cacheKey}`);
      
      // Clone and add cache headers
      const response = new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
      });
      
      response.headers.set("X-Cache", "HIT");
      response.headers.set("X-Cache-Source", "workers");
      return response;
    }
    
    // Cache miss - proceed to handler
    await next();
    
    // Store in cache if applicable
    const response = c.res;
    if (shouldStoreResponse(response, opts.cacheSuccessOnly)) {
      // Clone response before storing
      const responseToCache = response.clone();
      
      // Add cache headers
      const headers = new Headers(responseToCache.headers);
      if (opts.cacheControl) {
        headers.set("Cache-Control", opts.cacheControl);
      }
      
      const cacheResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });
      
      await cache.put(request, cacheResponse);
      console.log(`[Cache] Store (Workers): ${cacheKey}`);
    }
    
    // Add cache headers to response
    response.headers.set("X-Cache", "MISS");
    response.headers.set("X-Cache-Source", "workers");
    
  } catch (error) {
    console.error("[Cache] Workers cache error:", error);
    return next();
  }
}

/**
 * Handle caching for VPS (Memory Cache)
 */
async function handleMemoryCache(
  c: Context,
  next: Next,
  cacheKey: string,
  opts: UniversalCacheOptions,
  now: number
): Promise<Response | void> {
  // Check memory cache
  const cached = memoryCache.get(cacheKey);
  
  if (cached && cached.expiresAt > now) {
    console.log(`[Cache] Hit (VPS): ${cacheKey}`);
    
    const headers = new Headers(cached.headers);
    headers.set("X-Cache", "HIT");
    headers.set("X-Cache-Source", "vps-memory");
    
    return new Response(cached.body, {
      status: cached.status,
      headers,
    });
  }
  
  // Cache expired or miss
  if (cached) {
    memoryCache.delete(cacheKey);
  }
  
  // Proceed to handler
  await next();
  
  // Store in cache if applicable
  const response = c.res;
  if (shouldStoreResponse(response, opts.cacheSuccessOnly)) {
    try {
      const body = new Uint8Array(await response.arrayBuffer());
      const headers: Record<string, string> = {};
      
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      // Add cache-control if specified
      if (opts.cacheControl) {
        headers["Cache-Control"] = opts.cacheControl;
      }
      
      const entry: CacheEntry = {
        body,
        status: response.status,
        headers,
        expiresAt: now + (opts.ttlSeconds! * 1000),
      };
      
      memoryCache.set(cacheKey, entry);
      console.log(`[Cache] Store (VPS): ${cacheKey}, entries: ${memoryCache.size}`);
      
      // Clean expired entries periodically (1% chance)
      if (Math.random() < 0.01) {
        const cleaned = cleanExpiredCache();
        if (cleaned > 0) {
          console.log(`[Cache] Cleaned ${cleaned} expired entries`);
        }
      }
      
      // Restore response for client
      c.res = new Response(body, {
        status: response.status,
        headers: new Headers(headers),
      });
      
    } catch (error) {
      console.error("[Cache] VPS cache store error:", error);
    }
  }
  
  // Add cache headers
  c.res.headers.set("X-Cache", "MISS");
  c.res.headers.set("X-Cache-Source", "vps-memory");
}

/**
 * Check if response should be stored in cache
 */
function shouldStoreResponse(response: Response, cacheSuccessOnly?: boolean): boolean {
  if (!response) return false;
  
  if (cacheSuccessOnly && !response.ok) {
    return false;
  }
  
  // Don't cache if explicitly disabled
  const cacheControl = response.headers.get("Cache-Control");
  if (cacheControl) {
    if (cacheControl.includes("no-store") || cacheControl.includes("private")) {
      return false;
    }
  }
  
  // Don't cache responses with Set-Cookie
  if (response.headers.has("Set-Cookie")) {
    return false;
  }
  
  return true;
}

/**
 * Pre-configured cache durations
 */
export const cacheDuration = {
  /** 1 minute */
  short: 60,
  /** 5 minutes */
  medium: 300,
  /** 30 minutes */
  long: 1800,
  /** 2 hours */
  veryLong: 7200,
  /** 1 day */
  day: 86400,
} as const;

/**
 * Convenience wrappers for common cache durations
 */
export const cacheShort = (options?: UniversalCacheOptions) =>
  universalCache({ ttlSeconds: cacheDuration.short, ...options });

export const cacheMedium = (options?: UniversalCacheOptions) =>
  universalCache({ ttlSeconds: cacheDuration.medium, ...options });

export const cacheLong = (options?: UniversalCacheOptions) =>
  universalCache({ ttlSeconds: cacheDuration.long, ...options });

export const cacheVeryLong = (options?: UniversalCacheOptions) =>
  universalCache({ ttlSeconds: cacheDuration.veryLong, ...options });

export const cacheDay = (options?: UniversalCacheOptions) =>
  universalCache({ ttlSeconds: cacheDuration.day, ...options });
