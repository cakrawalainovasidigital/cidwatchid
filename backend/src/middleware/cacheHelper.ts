/**
 * Cache Helper for Routes
 * Provides easy-to-use cache configurations for different content types
 */

import { 
  universalCache, 
  cacheShort, 
  cacheMedium, 
  cacheLong, 
  cacheVeryLong, 
  cacheDay 
} from "./universalCache";

// Re-export from universalCache
export { 
  universalCache, 
  cacheShort, 
  cacheMedium, 
  cacheLong, 
  cacheVeryLong, 
  cacheDay,
  cleanExpiredCache,
  clearMemoryCache,
  getMemoryCacheStats,
} from "./universalCache";

/**
 * Recommended cache configurations for different content types
 */
export const contentCache = {
  /**
   * Homepage - cache for 2 hours (long lived, semi-static)
   */
  homepage: cacheVeryLong({
    cacheName: "homepage",
    cacheControl: "public, max-age=7200, stale-while-revalidate=3600",
  }),

  /**
   * Recommendations/Featured content - 30 minutes
   */
  recommendations: cacheLong({
    cacheName: "recommendations",
    cacheControl: "public, max-age=1800",
  }),

  /**
   * New releases - 10 minutes (frequently updated)
   */
  newReleases: cacheMedium({
    ttlSeconds: 600,
    cacheName: "new-releases",
    cacheControl: "public, max-age=600",
  }),

  /**
   * Rankings/Popular - 1 hour
   */
  rankings: cacheLong({
    ttlSeconds: 3600,
    cacheName: "rankings",
    cacheControl: "public, max-age=3600",
  }),

  /**
   * Search results - 5 minutes (dynamic)
   */
  search: cacheMedium({
    cacheName: "search",
    cacheControl: "public, max-age=300",
  }),

  /**
   * Search suggestions - 1 minute (very dynamic)
   */
  searchSuggest: cacheShort({
    cacheName: "search-suggest",
    cacheControl: "public, max-age=60",
  }),

  /**
   * Genre lists - 1 day (rarely changes)
   */
  genres: cacheDay({
    cacheName: "genres",
    cacheControl: "public, max-age=86400",
  }),

  /**
   * Genre content - 30 minutes
   */
  genreContent: cacheLong({
    cacheName: "genre-content",
    cacheControl: "public, max-age=1800",
  }),

  /**
   * Detail pages - 1 hour (content metadata)
   */
  detail: cacheLong({
    ttlSeconds: 3600,
    cacheName: "detail",
    cacheControl: "public, max-age=3600",
  }),

  /**
   * Stream/Episode links - 5 minutes (can change)
   */
  stream: cacheMedium({
    cacheName: "stream",
    cacheControl: "public, max-age=300",
  }),

  /**
   * Catalog/Category lists - 30 minutes
   */
  catalog: cacheLong({
    cacheName: "catalog",
    cacheControl: "public, max-age=1800",
  }),

  /**
   * Comments - 1 minute (frequently updated)
   */
  comments: cacheShort({
    cacheName: "comments",
    cacheControl: "public, max-age=60",
  }),

  /**
   * User data - don't cache by default
   * Use with caution - only for public user data
   */
  userPublic: cacheShort({
    cacheName: "user-public",
    cacheControl: "public, max-age=60",
  }),

  /**
   * Static/Meta data - 1 day
   */
  static: cacheDay({
    cacheName: "static",
    cacheControl: "public, max-age=86400, immutable",
  }),
};

/**
 * Create custom cache config with sensible defaults
 */
export function createCache(
  name: string,
  ttlSeconds: number,
  options?: {
    cacheControl?: string;
    cacheSuccessOnly?: boolean;
    skipPaths?: string[];
  }
) {
  return universalCache({
    cacheName: name,
    ttlSeconds,
    cacheControl: options?.cacheControl || `public, max-age=${ttlSeconds}`,
    cacheSuccessOnly: options?.cacheSuccessOnly ?? true,
    skipPaths: options?.skipPaths,
  });
}
