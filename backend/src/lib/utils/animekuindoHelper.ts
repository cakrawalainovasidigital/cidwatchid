/**
 * Animekuindo Helper
 * 
 * Helper untuk fetch data dari WordPress REST API animekuindo
 * dengan dukungan:
 * - Judul SERIES (general) dan per-episode
 * - IMAGE asli via partial HTML fetch
 * - VIDEO URL via HTML scraping (Blogger video)
 * 
 * @example
 * ```typescript
 * import { AnimekuindoHelper } from './animekuindoHelper';
 * 
 * const helper = new AnimekuindoHelper();
 * const episode = await helper.getEpisode(9483);
 * console.log(episode.videoUrl); // "https://www.blogger.com/video.g?token=..."
 * ```
 */

// Types
export interface VideoSource {
  type: 'blogger' | 'iframe' | 'direct';
  url: string;
  quality?: string;
  label?: string;
}

export interface AnimeSeries {
  id: number;
  title: string;
  slug: string;
  description: string;
  totalEpisodes: number;
  link: string;
  thumbnailUrl?: string;
}

export interface AnimeEpisode {
  id: number;
  seriesTitle: string;
  episodeTitle: string;
  episodeNumber: number | null;
  season: number | null;
  description: string;
  imageUrl: string;
  fallbackImageUrl: string;
  hasRealImage: boolean;
  videoUrl: string | null;        // ✅ Video URL (Blogger iframe)
  videoSources: VideoSource[];    // ✅ Array video sources kalau ada multiple
  videoHost: string | null;       // ✅ Host video (blogger, etc)
  slug: string;
  link: string;
  date: string;
  categoryId: number;
}

export interface AnimeCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  link: string;
}

export interface FetchOptions {
  perPage?: number;
  page?: number;
  search?: string;
  category?: number;
  cache?: boolean;
  includeImage?: boolean;
  includeVideo?: boolean;     // ✅ Opsi untuk include/exclude video fetch
}

// Cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;

  constructor(ttlMinutes: number = 60) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Constants
const BASE_URL = 'https://s2.animekuindo.life';
const REST_API = `${BASE_URL}/wp-json/wp/v2`;
const DEFAULT_TIMEOUT = 8000;
const PARTIAL_FETCH_MAX_BYTES = 25000; // Increased for video extraction
const LOGO_INDICATOR = 'DARK-LOGO';

export class AnimekuindoHelper {
  private postCache: Cache<AnimeEpisode>;
  private imageCache: Cache<string>;
  private videoCache: Cache<VideoSource[]>;
  private listCache: Cache<AnimeEpisode[]>;
  private categoryCache: Cache<AnimeCategory[]>;
  private seriesCache: Cache<AnimeSeries[]>;

  constructor(
    private options: {
      postCacheTtl?: number;
      imageCacheTtl?: number;
      videoCacheTtl?: number;
      listCacheTtl?: number;
      seriesCacheTtl?: number;
      timeout?: number;
      alwaysFetchRealImage?: boolean;
      alwaysFetchVideo?: boolean;  // ✅ Default fetch video
    } = {}
  ) {
    this.postCache = new Cache(options.postCacheTtl || 60);
    this.imageCache = new Cache(options.imageCacheTtl || 120);
    this.videoCache = new Cache(options.videoCacheTtl || 120);
    this.listCache = new Cache(options.listCacheTtl || 30);
    this.categoryCache = new Cache(120);
    this.seriesCache = new Cache(options.seriesCacheTtl || 120);
  }

  // ==================== SERIES METHODS ====================

  async getSeriesList(useCache: boolean = true): Promise<AnimeSeries[]> {
    if (useCache) {
      const cached = this.seriesCache.get('all');
      if (cached) return cached;
    }

    try {
      const categories = await this.fetchJson<any[]>(
        `${REST_API}/categories?per_page=100&orderby=count&order=desc`
      );

      const validCategories = categories.filter(cat => 
        cat.count > 0 && 
        !cat.slug.match(/^(uncategorized|berita|news|blog)$/i)
      );

      const series: AnimeSeries[] = validCategories.map(cat => ({
        id: cat.id,
        title: this.cleanSeriesTitle(cat.name),
        slug: cat.slug,
        description: cat.description || '',
        totalEpisodes: cat.count,
        link: cat.link
      }));

      if (useCache) {
        this.seriesCache.set('all', series);
      }

      return series;
    } catch (error) {
      console.error('Error fetching series list:', error);
      return [];
    }
  }

  async searchSeries(query: string): Promise<AnimeSeries[]> {
    const allSeries = await this.getSeriesList();
    const lowerQuery = query.toLowerCase();
    
    return allSeries.filter(series => 
      series.title.toLowerCase().includes(lowerQuery) ||
      series.slug.toLowerCase().includes(lowerQuery)
    );
  }

  async getSeries(slug: string): Promise<{
    series: AnimeSeries | null;
    episodes: AnimeEpisode[];
  }> {
    const category = await this.getCategoryBySlug(slug);
    if (!category) {
      return { series: null, episodes: [] };
    }

    const series: AnimeSeries = {
      id: category.id,
      title: this.cleanSeriesTitle(category.name),
      slug: category.slug,
      description: category.description || '',
      totalEpisodes: category.count,
      link: category.link
    };

    const result = await this.getPosts({ 
      category: category.id, 
      perPage: 100,
      includeImage: true,
      includeVideo: true
    });

    return {
      series,
      episodes: result.posts
    };
  }

  async getEpisodesBySeries(slug: string, options: { page?: number; perPage?: number } = {}): Promise<{
    series: AnimeSeries | null;
    episodes: AnimeEpisode[];
    total: number;
    totalPages: number;
  }> {
    const category = await this.getCategoryBySlug(slug);
    if (!category) {
      return { series: null, episodes: [], total: 0, totalPages: 0 };
    }

    const series: AnimeSeries = {
      id: category.id,
      title: this.cleanSeriesTitle(category.name),
      slug: category.slug,
      description: category.description || '',
      totalEpisodes: category.count,
      link: category.link
    };

    const result = await this.getPosts({
      category: category.id,
      page: options.page || 1,
      perPage: options.perPage || 20,
      includeImage: true,
      includeVideo: true
    });

    return {
      series,
      episodes: result.posts,
      total: result.total,
      totalPages: result.totalPages
    };
  }

  parseSeriesTitle(postTitle: string): string {
    let seriesTitle = postTitle
      .replace(/\s*Episode\s+\d+\s*/i, ' ')
      .replace(/\s*Season\s+\d+\s*/i, ' ')
      .replace(/\s*Subtitle\s+Indonesia\s*/i, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return seriesTitle;
  }

  // ==================== EPISODE METHODS ====================

  async getEpisode(id: number, useCache: boolean = true): Promise<AnimeEpisode | null> {
    const cacheKey = `episode_${id}`;
    
    if (useCache) {
      const cached = this.postCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const post = await this.fetchJson<any>(`${REST_API}/posts/${id}?_embed`);
      if (!post) return null;

      const episode = await this.parseEpisode(post, true, true);
      
      if (useCache) {
        this.postCache.set(cacheKey, episode);
      }

      return episode;
    } catch (error) {
      console.error(`Error fetching episode ${id}:`, error);
      return null;
    }
  }

  async getPosts(options: FetchOptions = {}): Promise<{
    posts: AnimeEpisode[];
    total: number;
    totalPages: number;
  }> {
    const { 
      perPage = 10, 
      page = 1, 
      search, 
      category, 
      cache = true,
      includeImage = true,
      includeVideo = true
    } = options;
    
    const cacheKey = `posts_${perPage}_${page}_${search || ''}_${category || ''}_${includeImage}_${includeVideo}`;
    
    if (cache) {
      const cached = this.listCache.get(cacheKey);
      if (cached) {
        return {
          posts: cached,
          total: cached.length,
          totalPages: Math.ceil(cached.length / perPage)
        };
      }
    }

    try {
      const params = new URLSearchParams({
        per_page: perPage.toString(),
        page: page.toString(),
        _embed: ''
      });
      
      if (search) params.append('search', search);
      if (category) params.append('categories', category.toString());

      const response = await fetch(`${REST_API}/posts?${params}`, {
        signal: AbortSignal.timeout(this.options.timeout || DEFAULT_TIMEOUT)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const total = parseInt(response.headers.get('X-WP-Total') || '0');
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0');
      
      const posts = await response.json() as any[];
      
      const episodes = await Promise.all(
        posts.map(post => this.parseEpisode(post, includeImage, includeVideo))
      );

      if (cache) {
        this.listCache.set(cacheKey, episodes);
      }

      return {
        posts: episodes,
        total,
        totalPages
      };
    } catch (error) {
      console.error('Error fetching posts:', error);
      return { posts: [], total: 0, totalPages: 0 };
    }
  }

  async getPostsByCategory(slug: string, options: { page?: number; perPage?: number; includeImage?: boolean; includeVideo?: boolean } = {}): Promise<{
    posts: AnimeEpisode[];
    category: AnimeCategory | null;
    total: number;
    totalPages: number;
  }> {
    const result = await this.getEpisodesBySeries(slug, options);
    return {
      posts: result.episodes,
      category: result.series ? {
        id: result.series.id,
        name: result.series.title,
        slug: result.series.slug,
        description: result.series.description,
        count: result.series.totalEpisodes,
        link: result.series.link
      } : null,
      total: result.total,
      totalPages: result.totalPages
    };
  }

  async getCategories(useCache: boolean = true): Promise<AnimeCategory[]> {
    if (useCache) {
      const cached = this.categoryCache.get('all');
      if (cached) return cached;
    }

    try {
      const categories = await this.fetchJson<any[]>(
        `${REST_API}/categories?per_page=100&orderby=count&order=desc`
      );

      const parsed: AnimeCategory[] = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        count: cat.count,
        link: cat.link
      }));

      if (useCache) {
        this.categoryCache.set('all', parsed);
      }

      return parsed;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async search(query: string, options: Omit<FetchOptions, 'search'> = {}): Promise<{
    posts: AnimeEpisode[];
    total: number;
    totalPages: number;
  }> {
    if (!query.trim()) return { posts: [], total: 0, totalPages: 0 };
    return this.getPosts({ ...options, search: query });
  }

  async getLatestPosts(count: number = 10, includeImage: boolean = true, includeVideo: boolean = true): Promise<AnimeEpisode[]> {
    const result = await this.getPosts({ perPage: count, page: 1, includeImage, includeVideo });
    return result.posts;
  }

  parseTitle(title: string): {
    animeName: string;
    seriesTitle: string;
    episodeNumber: number | null;
    season: number | null;
  } {
    const episodeMatch = title.match(/Episode\s+(\d+)/i);
    const seasonMatch = title.match(/Season\s+(\d+)/i);
    
    let animeName = title
      .replace(/Episode\s+\d+\s*/i, '')
      .replace(/Season\s+\d+\s*/i, '')
      .replace(/Subtitle\s+Indonesia/i, '')
      .trim();
    
    const seriesTitle = animeName.replace(/Subtitle\s+Indonesia/i, '').trim();

    return {
      animeName,
      seriesTitle,
      episodeNumber: episodeMatch ? parseInt(episodeMatch[1]) : null,
      season: seasonMatch ? parseInt(seasonMatch[1]) : null
    };
  }

  clearCache(): void {
    this.postCache.clear();
    this.imageCache.clear();
    this.videoCache.clear();
    this.listCache.clear();
    this.categoryCache.clear();
    this.seriesCache.clear();
  }

  getCacheStats(): {
    posts: number;
    images: number;
    videos: number;
    lists: number;
    categories: number;
    series: number;
  } {
    return {
      posts: this.postCache.size(),
      images: this.imageCache.size(),
      videos: this.videoCache.size(),
      lists: this.listCache.size(),
      categories: this.categoryCache.size(),
      series: this.seriesCache.size()
    };
  }

  // ==================== VIDEO EXTRACTION (BARU) ====================

  /**
   * ✅ Extract video URL dari post link
   * Scrape HTML untuk mendapatkan video iframe (Blogger, dll)
   */
  async getVideoSources(postLink: string, useCache: boolean = true): Promise<VideoSource[]> {
    const cacheKey = `video_${postLink}`;
    
    if (useCache) {
      const cached = this.videoCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const sources = await this.extractVideoFromHtml(postLink);
      
      if (sources.length > 0 && useCache) {
        this.videoCache.set(cacheKey, sources);
      }

      return sources;
    } catch (error) {
      console.error(`Error extracting video from ${postLink}:`, error);
      return [];
    }
  }

  /**
   * ✅ Extract video dari HTML dengan partial fetch
   */
  private async extractVideoFromHtml(postLink: string): Promise<VideoSource[]> {
    const sources: VideoSource[] = [];
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(postLink, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html'
        }
      });

      clearTimeout(timeout);

      if (!response.body) return sources;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let bytesRead = 0;

      while (bytesRead < PARTIAL_FETCH_MAX_BYTES) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        bytesRead += value.length;

        // ✅ Cari Blogger video iframe
        const bloggerMatch = buffer.match(/<iframe[^>]+src="(https:\/\/www\.blogger\.com\/video\.g\?token=[^"]+)"/i);
        if (bloggerMatch) {
          sources.push({
            type: 'blogger',
            url: bloggerMatch[1],
            label: 'Blogger Video'
          });
          await reader.cancel();
          return sources;
        }

        // ✅ Cari iframe video lainnya (exclude GTM, analytics)
        const iframeMatch = buffer.match(/<iframe[^>]+src="(https?:\/\/[^"]+)"/gi);
        if (iframeMatch) {
          for (const match of iframeMatch) {
            const urlMatch = match.match(/src="([^"]+)"/);
            if (urlMatch) {
              const url = urlMatch[1];
              // Skip non-video iframes
              if (!url.includes('googletagmanager') && 
                  !url.includes('google-analytics') &&
                  !url.includes('facebook.com/tr')) {
                sources.push({
                  type: 'iframe',
                  url: url,
                  label: 'External Player'
                });
              }
            }
          }
          if (sources.length > 0) {
            await reader.cancel();
            return sources;
          }
        }

        // ✅ Cari direct video links
        const videoMatch = buffer.match(/(https?:\/\/[^"<>]+\.(mp4|m3u8|webm))/i);
        if (videoMatch) {
          sources.push({
            type: 'direct',
            url: videoMatch[1],
            label: 'Direct Video'
          });
          await reader.cancel();
          return sources;
        }

        // Safety limit
        if (buffer.includes('</head>') && bytesRead > 15000) {
          await reader.cancel();
          break;
        }
      }

      return sources;

    } catch (error) {
      return sources;
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.options.timeout || DEFAULT_TIMEOUT),
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private async getCategoryBySlug(slug: string): Promise<AnimeCategory | null> {
    try {
      const categories = await this.fetchJson<any[]>(
        `${REST_API}/categories?slug=${encodeURIComponent(slug)}`
      );
      
      if (!categories.length) return null;
      
      const cat = categories[0];
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        count: cat.count,
        link: cat.link
      };
    } catch (error) {
      console.error(`Error fetching category ${slug}:`, error);
      return null;
    }
  }

  private cleanSeriesTitle(name: string): string {
    return name
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async parseEpisode(
    post: any, 
    fetchRealImage: boolean = true,
    fetchVideo: boolean = true
  ): Promise<AnimeEpisode> {
    const title = post.title?.rendered || '';
    const excerpt = post.excerpt?.rendered || '';
    const categoryData = post._embedded?.['wp:term']?.[0]?.[0];
    
    const episodeMatch = title.match(/Episode\s+(\d+)/i);
    const seasonMatch = title.match(/Season\s+(\d+)/i);
    
    const seriesTitle = categoryData?.name 
      ? this.cleanSeriesTitle(categoryData.name)
      : this.parseSeriesTitle(title);
    
    const categoryId = categoryData?.id || 0;
    
    // Fallback image
    const fallbackImage = post.yoast_head_json?.og_image?.[0]?.url || '';
    
    // Fetch real image
    let imageUrl = fallbackImage;
    let hasRealImage = false;
    
    if (fetchRealImage && fallbackImage.includes(LOGO_INDICATOR)) {
      try {
        const realImage = await this.fetchRealImageWithCache(post.link);
        if (realImage && !realImage.includes(LOGO_INDICATOR)) {
          imageUrl = realImage;
          hasRealImage = true;
        }
      } catch (e) {
        // Use fallback
      }
    } else if (!fallbackImage.includes(LOGO_INDICATOR)) {
      hasRealImage = true;
    }

    // ✅ Fetch video sources
    let videoSources: VideoSource[] = [];
    let videoUrl: string | null = null;
    let videoHost: string | null = null;
    
    if (fetchVideo) {
      try {
        videoSources = await this.getVideoSources(post.link);
        if (videoSources.length > 0) {
          videoUrl = videoSources[0].url;
          videoHost = this.extractVideoHost(videoUrl);
        }
      } catch (e) {
        // Video fetch failed
      }
    }

    return {
      id: post.id,
      seriesTitle,
      episodeTitle: title,
      episodeNumber: episodeMatch ? parseInt(episodeMatch[1]) : null,
      season: seasonMatch ? parseInt(seasonMatch[1]) : null,
      description: this.cleanHtml(excerpt),
      imageUrl,
      fallbackImageUrl: fallbackImage,
      hasRealImage,
      videoUrl,           // ✅ Primary video URL
      videoSources,       // ✅ All video sources
      videoHost,          // ✅ Video host info
      slug: post.slug,
      link: post.link,
      date: post.date,
      categoryId
    };
  }

  private extractVideoHost(url: string): string | null {
    if (url.includes('blogger.com')) return 'blogger';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('dailymotion.com')) return 'dailymotion';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('stream')) return 'streaming';
    return 'external';
  }

  private async fetchRealImageWithCache(postLink: string): Promise<string | null> {
    const cacheKey = `img_${postLink}`;
    
    const cached = this.imageCache.get(cacheKey);
    if (cached) return cached;

    const imageUrl = await this.fetchPartialImage(postLink);
    
    if (imageUrl) {
      this.imageCache.set(cacheKey, imageUrl);
    }

    return imageUrl;
  }

  private async fetchPartialImage(postLink: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(postLink, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html'
        }
      });

      clearTimeout(timeout);

      if (!response.body) return null;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let bytesRead = 0;

      while (bytesRead < PARTIAL_FETCH_MAX_BYTES) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        bytesRead += value.length;

        const ogImageMatches = [...buffer.matchAll(/<meta\s+property="og:image"\s+content="([^"]+)"/gi)];
        
        if (ogImageMatches.length >= 2) {
          await reader.cancel();
          return ogImageMatches[1][1];
        }

        if (buffer.includes('</head>')) {
          await reader.cancel();
          break;
        }
      }

      const singleMatch = buffer.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      return singleMatch?.[1] || null;

    } catch (error) {
      return null;
    }
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
      .replace(/&\w+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// ==================== CONVENIENCE EXPORTS ====================

export const animekuindo = new AnimekuindoHelper({
  postCacheTtl: 60,
  imageCacheTtl: 120,
  videoCacheTtl: 120,
  listCacheTtl: 30,
  timeout: 8000,
  alwaysFetchRealImage: true,
  alwaysFetchVideo: true
});

export async function getAnimePost(id: number): Promise<AnimeEpisode | null> {
  return animekuindo.getEpisode(id);
}

export async function searchAnime(query: string): Promise<AnimeEpisode[]> {
  const result = await animekuindo.search(query);
  return result.posts;
}

export async function getLatestAnime(count: number = 10): Promise<AnimeEpisode[]> {
  return animekuindo.getLatestPosts(count, true, true);
}

/**
 * ✅ Extract video URL standalone function
 */
export async function extractVideoUrl(postUrl: string): Promise<string | null> {
  const sources = await animekuindo.getVideoSources(postUrl);
  return sources[0]?.url || null;
}

export default AnimekuindoHelper;
