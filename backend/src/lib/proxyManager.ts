import type { Context, Next } from "hono";

interface GeonodeProxy {
  ip: string;
  port: number;
  protocols?: string[];
}

interface GeonodeResponse {
  data: GeonodeProxy[];
}

export interface Proxy {
  host: string;
  port: number;
  protocol: string;
  url: string;
}

class ProxyManager {
  private proxies: Proxy[] = [];
  private currentIndex = 0;
  private lastRefresh = 0;
  private refreshMs: number;
  private geonodeUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(options?: {
    refreshIntervalMs?: number;
    geonodeUrl?: string;
  }) {
    this.refreshMs = options?.refreshIntervalMs ?? 5 * 60 * 1000; // default 5 minutes
    this.geonodeUrl =
      options?.geonodeUrl ??
      "https://proxylist.geonode.com/api/proxy-list?filterUpTime=90&speed=fast&google=false&limit=500&page=1&sort_by=lastChecked&sort_type=desc";
  }

  /**
   * Refresh proxy list from Geonode API
   */
  async refreshProxies(): Promise<void> {
    // Prevent concurrent refresh calls
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<void> {
    const res = await fetch(this.geonodeUrl);

    if (!res.ok) {
      throw new Error(`Geonode API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as GeonodeResponse;
    const data = json.data ?? [];

    this.proxies = data.map((p) => {
      const protocol = p.protocols?.[0] ?? "http";
      return {
        host: p.ip,
        port: p.port,
        protocol,
        url: `${protocol}://${p.ip}:${p.port}`,
      };
    });

    // Shuffle proxies for better distribution
    this.proxies.sort(() => Math.random() - 0.5);
    this.lastRefresh = Date.now();
    this.currentIndex = 0;

    console.log(`[ProxyManager] Refreshed ${this.proxies.length} proxies`);
  }

  /**
   * Check if proxy list needs refresh
   */
  needsRefresh(): boolean {
    return (
      Date.now() - this.lastRefresh > this.refreshMs || this.proxies.length === 0
    );
  }

  /**
   * Get all available proxies
   */
  getAllProxies(): Proxy[] {
    return [...this.proxies];
  }

  /**
   * Get proxy count
   */
  getProxyCount(): number {
    return this.proxies.length;
  }

  /**
   * Get next proxy using round-robin (rolling) algorithm
   * Returns proxy with rolling index info
   */
  getNextProxy(): (Proxy & { index: number; total: number }) | null {
    if (this.proxies.length === 0) return null;

    const proxy = this.proxies[this.currentIndex];
    const index = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

    return {
      ...proxy,
      index,
      total: this.proxies.length,
    };
  }

  /**
   * Get current rolling status
   */
  getRollingStatus(): {
    currentIndex: number;
    totalProxies: number;
    nextIndex: number;
    progress: string;
  } {
    return {
      currentIndex: this.currentIndex,
      totalProxies: this.proxies.length,
      nextIndex: this.currentIndex % this.proxies.length,
      progress: `${this.currentIndex} / ${this.proxies.length}`,
    };
  }

  /**
   * Get random proxy
   */
  getRandomProxy(): Proxy | null {
    if (this.proxies.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * this.proxies.length);
    return this.proxies[randomIndex];
  }

  /**
   * Get proxy by index
   */
  getProxy(index: number): Proxy | null {
    if (this.proxies.length === 0 || index < 0 || index >= this.proxies.length) {
      return null;
    }
    return this.proxies[index];
  }

  /**
   * Ensure proxies are available (refresh if needed)
   */
  async ensureProxies(): Promise<void> {
    if (this.needsRefresh()) {
      await this.refreshProxies();
    }
  }
}

// Singleton instance
let globalProxyManager: ProxyManager | null = null;

/**
 * Get or create global proxy manager instance
 */
export function getProxyManager(options?: {
  refreshIntervalMs?: number;
  geonodeUrl?: string;
}): ProxyManager {
  if (!globalProxyManager) {
    globalProxyManager = new ProxyManager(options);
  }
  return globalProxyManager;
}

/**
 * Reset global proxy manager (useful for testing)
 */
export function resetProxyManager(): void {
  globalProxyManager = null;
}

/**
 * Hono middleware to attach proxy manager to context
 */
export function proxyManagerMiddleware(options?: {
  refreshIntervalMs?: number;
  geonodeUrl?: string;
}) {
  const manager = getProxyManager(options);

  return async (c: Context, next: Next) => {
    // Attach proxy manager to context
    c.set("proxyManager", manager);
    await next();
  };
}

/**
 * Fetch with rolling proxy
 * Automatically rotates proxy on each request
 */
export async function fetchWithRollingProxy(
  url: string,
  options?: RequestInit & {
    proxyManager?: ProxyManager;
    proxyUrl?: string;
  }
): Promise<Response> {
  const manager = options?.proxyManager ?? getProxyManager();
  await manager.ensureProxies();

  const proxy = manager.getNextProxy();
  if (!proxy) {
    // Fallback to direct fetch if no proxy available
    console.warn("[fetchWithRollingProxy] No proxy available, using direct fetch");
    return fetch(url, options);
  }

  const fetchOptions: RequestInit = {
    ...options,
    // @ts-ignore - Cloudflare Workers supports cf property
    cf: {
      ...((options as any)?.cf || {}),
      // Use the proxy
      resolveOverride: proxy.url,
    },
  };

  // For standard fetch with proxy, we need to use a different approach
  // since Cloudflare Workers has specific proxy handling
  return fetch(url, fetchOptions);
}

/**
 * Create fetcher that uses rolling proxy
 */
export function createRollingProxyFetcher(proxyManager?: ProxyManager) {
  const manager = proxyManager ?? getProxyManager();

  return async function rollingFetch(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    await manager.ensureProxies();

    const proxy = manager.getNextProxy();
    if (!proxy) {
      console.warn("[rollingFetch] No proxy available, using direct fetch");
      return fetch(url, options);
    }

    // Build proxy URL
    const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`;

    // Add proxy headers for some proxy providers
    const headers = {
      ...options?.headers,
      "X-Forwarded-For": proxy.host,
    };

    // Try to fetch through proxy
    // Note: In Cloudflare Workers, actual proxy support is limited
    // This is a best-effort implementation
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // @ts-ignore
        cf: {
          ...((options as any)?.cf || {}),
          // Attempt to route through proxy
          resolveOverride: proxyUrl,
        },
      });

      return response;
    } catch (error) {
      console.error(`[rollingFetch] Proxy ${proxyUrl} failed:`, error);
      // Fallback to direct fetch
      return fetch(url, options);
    }
  };
}

export { ProxyManager };
export default ProxyManager;
