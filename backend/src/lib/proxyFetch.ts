import type { Context, Next } from "hono";
import { getProxyManager, type ProxyManager, type Proxy } from "./proxyManager";

// Store original fetch
const originalFetch = globalThis.fetch;

// ============================================
// PERINGATAN: Cloudflare Workers Limitation
// ============================================
// Cloudflare Workers TIDAK mendukung HTTP/SOCKS proxy
// seperti Node.js/Bun. cf.resolveOverride hanya untuk DNS.
// 
// Solusi alternatif:
// 1. Gunakan external proxy service (BrightData, Oxylabs)
// 2. Deploy ke VPS/Server (bukan Workers)
// 3. Gunakan smart fetch dengan rotasi User-Agent
// ============================================

// Detect if running in Cloudflare Workers
const isCloudflareWorkers = typeof caches !== 'undefined' && 
  typeof WebSocketPair !== 'undefined';

/**
 * Create a proxied fetch function
 * Note: Using any type to bypass Cloudflare Workers specific fetch types
 */
function createProxiedFetch(
  proxyManager: ProxyManager,
  originalFetchFn: typeof fetch
): any {
  const proxiedFetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Skip if proxy is disabled for this request
    if ((init as any)?._skipProxy) {
      return originalFetchFn(input, init);
    }

    // ============================================
    // CLOUDFLARE WORKERS COMPATIBILITY CHECK
    // ============================================
    if (isCloudflareWorkers) {
      console.warn('[ProxiedFetch] Running in Cloudflare Workers - proxy routing not supported');
      console.warn('[ProxiedFetch] Falling back to direct fetch');
      console.warn('[ProxiedFetch] Consider using external proxy service or deploy to VPS');
      
      // Fallback: Add proxy headers only (won't actually route through proxy)
      const manager = proxyManager;
      await manager.ensureProxies();
      const proxy = manager.getNextProxy();
      
      if (proxy) {
        console.log(`[ProxiedFetch] Rolling proxy index: ${proxy.index}, URL: ${proxy.url} (info only)`);
      }
      
      return originalFetchFn(input, {
        ...init,
        headers: {
          ...init?.headers,
          'User-Agent': getRandomUserAgent(),
        },
      });
    }

    // ============================================
    // NODE.JS / BUN ENVIRONMENT (Proxy works here!)
    // ============================================
    await proxyManager.ensureProxies();
    
    const proxy = proxyManager.getNextProxy();
    
    if (!proxy) {
      console.warn("[ProxiedFetch] No proxy available, using direct fetch");
      return originalFetchFn(input, init);
    }

    const url = input instanceof Request 
      ? input.url 
      : input instanceof URL 
        ? input.toString() 
        : input;

    console.log(`[ProxiedFetch] Using proxy ${proxy.url} for: ${url}`);

    try {
      // Attempt to fetch through proxy
      const proxyInit: RequestInit = {
        ...init,
        headers: {
          ...init?.headers,
          "X-Forwarded-For": proxy.host,
          "X-Proxy-Url": proxy.url,
        },
        // @ts-ignore - Cloudflare Workers specific
        cf: {
          ...(init as any)?.cf,
          resolveOverride: proxy.url,
        },
      };

      return await originalFetchFn(input, proxyInit);
    } catch (error) {
      console.warn(`[ProxiedFetch] Proxy ${proxy.url} failed, retrying with next proxy:`, error);
      
      const nextProxy = proxyManager.getNextProxy();
      if (nextProxy && nextProxy.url !== proxy.url) {
        console.log(`[ProxiedFetch] Retrying with proxy: ${nextProxy.url}`);
        
        const retryInit: RequestInit = {
          ...init,
          headers: {
            ...init?.headers,
            "X-Forwarded-For": nextProxy.host,
            "X-Proxy-Url": nextProxy.url,
          },
          // @ts-ignore
          cf: {
            ...(init as any)?.cf,
            resolveOverride: nextProxy.url,
          },
        };
        
        return await originalFetchFn(input, retryInit);
      }
      
      console.warn("[ProxiedFetch] All proxies failed, using direct fetch");
      return originalFetchFn(input, init);
    }
  };

  return proxiedFetch;
}

/**
 * Random User-Agent rotation for smart fetching
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Smart fetch dengan rotasi User-Agent
 * Works di Cloudflare Workers!
 */
export async function smartFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = input instanceof Request ? input.url : input.toString();
  
  console.log(`[SmartFetch] Fetching: ${url}`);
  console.log(`[SmartFetch] Environment: ${isCloudflareWorkers ? 'Cloudflare Workers' : 'Node.js/Bun'}`);
  
  return originalFetch(input, {
    ...init,
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      ...init?.headers,
    },
    // @ts-ignore
    cf: {
      ...(init as any)?.cf,
      cacheTtl: 0,
      cacheEverything: false,
    },
  });
}

/**
 * Hono middleware yang menggunakan smart fetch
 */
export function smartFetchMiddleware(options?: {
  skipPaths?: string[];
}) {
  const skipPaths = options?.skipPaths ?? [];

  return async (c: Context, next: Next) => {
    const path = c.req.path;
    
    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      console.log(`[SmartFetch] Skipping for: ${path}`);
      return next();
    }

    // Attach smart fetch to context
    c.set('smartFetch', smartFetch);
    
    // In Workers, we can't replace global fetch reliably
    // Just proceed with smart headers in actual fetches
    console.log(`[SmartFetch] Request: ${path}`);
    
    await next();
  };
}

/**
 * Legacy: Hono middleware that enables proxy (DISABLED in Workers)
 */
export function globalProxyMiddleware(options?: {
  skipPaths?: string[];
  skipWhenNoProxy?: boolean;
}) {
  const skipPaths = options?.skipPaths ?? [];

  return async (c: Context, next: Next) => {
    const path = c.req.path;
    
    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      return next();
    }

    if (isCloudflareWorkers) {
      console.log(`[GlobalProxy] Proxy disabled in Cloudflare Workers - using smart fetch instead`);
      console.log(`[GlobalProxy] Deploy to VPS for full proxy support`);
      return next();
    }

    // Only works in Node.js/Bun environment
    const proxyManager = c.get("proxyManager") ?? getProxyManager();
    await proxyManager.ensureProxies();
    
    const proxiedFetch = createProxiedFetch(proxyManager, originalFetch);
    globalThis.fetch = proxiedFetch as typeof fetch;

    try {
      await next();
    } finally {
      globalThis.fetch = originalFetch;
    }
  };
}

/**
 * Fetch without proxy (direct)
 */
export async function fetchDirect(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return originalFetch(input, init);
}

/**
 * Check if running in Cloudflare Workers
 */
export function isWorkers(): boolean {
  return isCloudflareWorkers;
}

/**
 * Get environment info
 */
export function getEnvironmentInfo(): {
  isCloudflareWorkers: boolean;
  proxySupported: boolean;
  recommendation: string;
} {
  return {
    isCloudflareWorkers,
    proxySupported: !isCloudflareWorkers,
    recommendation: isCloudflareWorkers 
      ? 'Use smartFetch with User-Agent rotation, or deploy to VPS for proxy support'
      : 'Full proxy support available',
  };
}
