import type { Context } from "hono";
import { getProxyManager, type ProxyManager } from "./proxyManager";

type AppEnv = {
  Bindings: Env;
};

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  useProxy?: boolean;
  proxyManager?: ProxyManager;
};

/**
 * Fetch with optional rolling proxy support
 * 
 * @example
 * // Without proxy
 * const data = await fetcherWithProxy(c, '/api/data');
 * 
 * @example
 * // With rolling proxy (auto-rotate)
 * const data = await fetcherWithProxy(c, '/api/data', { useProxy: true });
 */
export async function fetcherWithProxy<T = unknown>(
  c: Context<AppEnv>,
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { 
    method = "GET", 
    body, 
    headers = {},
    useProxy = false,
    proxyManager: customManager 
  } = options;

  const proxyManager = customManager ?? c.get("proxyManager") ?? getProxyManager();
  
  // Prepare fetch options
  const fetchInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  let response: Response;

  if (useProxy) {
    // Use rolling proxy
    await proxyManager.ensureProxies();
    const proxy = proxyManager.getNextProxy();

    if (proxy) {
      console.log(`[fetcherWithProxy] Using proxy: ${proxy.url}`);
      
      try {
        // Add proxy-specific headers
        const proxyHeaders = {
          ...fetchInit.headers,
          "X-Forwarded-For": proxy.host,
        };

        response = await fetch(url, {
          ...fetchInit,
          headers: proxyHeaders,
          // @ts-ignore - Cloudflare Workers specific
          cf: {
            resolveOverride: proxy.url,
          },
        });
      } catch (error) {
        console.warn(`[fetcherWithProxy] Proxy ${proxy.url} failed, falling back to direct:`, error);
        // Fallback to direct fetch
        response = await fetch(url, fetchInit);
      }
    } else {
      console.warn("[fetcherWithProxy] No proxy available, using direct fetch");
      response = await fetch(url, fetchInit);
    }
  } else {
    // Direct fetch without proxy
    response = await fetch(url, fetchInit);
  }

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// Shortcut methods with proxy support
export const getWithProxy = <T = unknown>(
  c: Context<AppEnv>,
  url: string,
  headers?: Record<string, string>,
  useProxy?: boolean
) => fetcherWithProxy<T>(c, url, { method: "GET", headers, useProxy });

export const postWithProxy = <T = unknown>(
  c: Context<AppEnv>,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
  useProxy?: boolean
) => fetcherWithProxy<T>(c, url, { method: "POST", body, headers, useProxy });

export const putWithProxy = <T = unknown>(
  c: Context<AppEnv>,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
  useProxy?: boolean
) => fetcherWithProxy<T>(c, url, { method: "PUT", body, headers, useProxy });

export const delWithProxy = <T = unknown>(
  c: Context<AppEnv>,
  url: string,
  headers?: Record<string, string>,
  useProxy?: boolean
) => fetcherWithProxy<T>(c, url, { method: "DELETE", headers, useProxy });

/**
 * Middleware to add rolling proxy to context
 * This sets up a new proxy for each request
 */
export function rollingProxyMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const proxyManager = getProxyManager();
    await proxyManager.ensureProxies();
    
    // Get next rolling proxy and attach to context
    const proxy = proxyManager.getNextProxy();
    if (proxy) {
      c.set("currentProxy", proxy);
      console.log(`[rollingProxyMiddleware] Assigned proxy: ${proxy.url}`);
    }
    
    await next();
  };
}
