import type { Context, Next } from "hono";
import { isWorkers, isVPS } from "../lib/envAdapter";

interface RateLimitEntry {
  count: number
  resetTime: number
}

const memoryStore = new Map<string, RateLimitEntry>()


const MAX_REQUESTS = 100
const WINDOW_MS = 60 * 1000


async function getClientIP(c: Context): Promise<string> {
  
  const headers = c.req.header()
  
  const ip = headers["cf-connecting-ip"] || // Cloudflare
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["x-real-ip"] ||
    headers["x-client-ip"] ||
    headers["x-forwarded"] ||
    headers["forwarded-for"] ||
    headers["forwarded"]

  if (ip) return ip

  
  if (isVPS()) {
    try {
      // Dynamic import to avoid loading in Workers
      const { getConnInfo } = await import("hono/bun")
      const info = getConnInfo(c)
      return info.remote.address || "unknown"
    } catch {
      return "unknown"
    }
  }

  return "unknown"
}

export async function rateLimit(c: Context, next: Next) {
  const clientIP = await getClientIP(c)
  const key = `ratelimit:${clientIP}`
  const now = Date.now()

  if (isWorkers()) {
    
    const cache = caches.default
    const cacheKey = new Request(`https://rate-limit.internal/${key}`)
    
    const cached = await cache.match(cacheKey)
    let entry: RateLimitEntry

    if (cached) {
      entry = await cached.json() as RateLimitEntry
      // Reset if window has passed
      if (now > entry.resetTime) {
        entry = { count: 0, resetTime: now + WINDOW_MS }
      }
    } else {
      entry = { count: 0, resetTime: now + WINDOW_MS }
    }

    
    if (entry.count >= MAX_REQUESTS) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      return c.json(
        {
          success: false,
          message: "Rate limit exceeded. Too many requests.",
          retryAfter,
          limit: MAX_REQUESTS,
          window: "1 minute"
        },
        429,
        {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000))
        }
      )
    }

    entry.count++
    
    await cache.put(
      cacheKey,
      new Response(JSON.stringify(entry), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${Math.ceil(WINDOW_MS / 1000)}`
        }
      })
    )

    c.header("X-RateLimit-Limit", String(MAX_REQUESTS))
    c.header("X-RateLimit-Remaining", String(MAX_REQUESTS - entry.count))
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)))

  } else {
    
    let entry = memoryStore.get(key)

    if (entry && now > entry.resetTime) {
      memoryStore.delete(key)
      entry = undefined
    }

    if (!entry) {
      entry = { count: 0, resetTime: now + WINDOW_MS }
      memoryStore.set(key, entry)
    }

    if (entry.count >= MAX_REQUESTS) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      return c.json(
        {
          success: false,
          message: "Rate limit exceeded. Too many requests.",
          retryAfter,
          limit: MAX_REQUESTS,
          window: "1 minute"
        },
        429,
        {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000))
        }
      )
    }

    entry.count++

    // Set rate limit headers
    c.header("X-RateLimit-Limit", String(MAX_REQUESTS))
    c.header("X-RateLimit-Remaining", String(MAX_REQUESTS - entry.count))
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)))
  }

  await next()
}

export async function rateLimitStrict(c: Context, next: Next) {
  const clientIP = await getClientIP(c)
  const key = `ratelimit:strict:${clientIP}`
  const now = Date.now()
  const maxRequests = 20

  if (isWorkers()) {
    const cache = caches.default
    const cacheKey = new Request(`https://rate-limit.internal/${key}`)
    
    const cached = await cache.match(cacheKey)
    let entry: RateLimitEntry

    if (cached) {
      entry = await cached.json() as RateLimitEntry
      if (now > entry.resetTime) {
        entry = { count: 0, resetTime: now + WINDOW_MS }
      }
    } else {
      entry = { count: 0, resetTime: now + WINDOW_MS }
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      return c.json(
        {
          success: false,
          message: "Rate limit exceeded. Too many requests.",
          retryAfter,
          limit: maxRequests,
          window: "1 minute"
        },
        429,
        {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000))
        }
      )
    }

    entry.count++
    
    await cache.put(
      cacheKey,
      new Response(JSON.stringify(entry), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${Math.ceil(WINDOW_MS / 1000)}`
        }
      })
    )

    c.header("X-RateLimit-Limit", String(maxRequests))
    c.header("X-RateLimit-Remaining", String(maxRequests - entry.count))
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)))

  } else {
    let entry = memoryStore.get(key)

    if (entry && now > entry.resetTime) {
      memoryStore.delete(key)
      entry = undefined
    }

    if (!entry) {
      entry = { count: 0, resetTime: now + WINDOW_MS }
      memoryStore.set(key, entry)
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      return c.json(
        {
          success: false,
          message: "Rate limit exceeded. Too many requests.",
          retryAfter,
          limit: maxRequests,
          window: "1 minute"
        },
        429,
        {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000))
        }
      )
    }

    entry.count++

    c.header("X-RateLimit-Limit", String(maxRequests))
    c.header("X-RateLimit-Remaining", String(maxRequests - entry.count))
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)))
  }

  await next()
}

export function createRateLimit(maxRequests: number, windowMs: number = 60000) {
  return async function customRateLimit(c: Context, next: Next) {
    const clientIP = await getClientIP(c)
    const key = `ratelimit:custom:${clientIP}`
    const now = Date.now()

    if (isWorkers()) {
      const cache = caches.default
      const cacheKey = new Request(`https://rate-limit.internal/${key}`)
      
      const cached = await cache.match(cacheKey)
      let entry: RateLimitEntry

      if (cached) {
        entry = await cached.json() as RateLimitEntry
        if (now > entry.resetTime) {
          entry = { count: 0, resetTime: now + windowMs }
        }
      } else {
        entry = { count: 0, resetTime: now + windowMs }
      }

      if (entry.count >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
        return c.json(
          {
            success: false,
            message: "Rate limit exceeded. Too many requests.",
            retryAfter,
            limit: maxRequests,
            window: `${windowMs / 1000} seconds`
          },
          429,
          {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000))
          }
        )
      }

      entry.count++
      
      await cache.put(
        cacheKey,
        new Response(JSON.stringify(entry), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `max-age=${Math.ceil(windowMs / 1000)}`
          }
        })
      )

      c.header("X-RateLimit-Limit", String(maxRequests))
      c.header("X-RateLimit-Remaining", String(maxRequests - entry.count))
      c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)))

    } else {
      let entry = memoryStore.get(key)

      if (entry && now > entry.resetTime) {
        memoryStore.delete(key)
        entry = undefined
      }

      if (!entry) {
        entry = { count: 0, resetTime: now + windowMs }
        memoryStore.set(key, entry)
      }

      if (entry.count >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
        return c.json(
          {
            success: false,
            message: "Rate limit exceeded. Too many requests.",
            retryAfter,
            limit: maxRequests,
            window: `${windowMs / 1000} seconds`
          },
          429,
          {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000))
          }
        )
      }

      entry.count++

      c.header("X-RateLimit-Limit", String(maxRequests))
      c.header("X-RateLimit-Remaining", String(maxRequests - entry.count))
      c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)))
    }

    await next()
  }
}
