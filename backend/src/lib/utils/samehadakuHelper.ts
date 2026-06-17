/**
 * Samehadaku Helper - Comprehensive API Integration
 * 
 * Fetches complete data from Samehadaku WordPress REST API
 * Extracts Image URLs and Video URLs (embed + direct sources)
 * Unified TypeScript types for consistent data handling
 */

// ============================================================================
// BASE CONFIGURATION
// ============================================================================

const BASE_URL = "https://v1.samehadaku.how/wp-json";
const API_TIMEOUT = 30000;

// Headers for API requests
const getHeaders = () => ({
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
  "Accept": "application/json",
  "Content-Type": "application/json",
});

// Cookie storage (for Cloudflare bypass)
let cookieStore: string | null = null;

// ============================================================================
// UNIFIED TYPES
// ============================================================================

/** Video quality types */
export type VideoQuality = "360p" | "480p" | "720p" | "1080p" | "unknown";

/** Video source providers */
export type VideoProvider = "wibufile" | "blogspot" | "mega" | "filedon" | "unknown";

/** Video stream type */
export type VideoType = "embed" | "direct" | "stream";

/** Video source information */
export interface VideoSource {
  /** Provider name */
  provider: VideoProvider;
  /** Video quality */
  quality: VideoQuality;
  /** Type of video source */
  type: VideoType;
  /** Embed URL (iframe src) */
  embedUrl?: string;
  /** Direct video URL (mp4/m3u8) */
  directUrl?: string;
  /** Original iframe HTML */
  iframeHtml?: string;
  /** Is this source available */
  available: boolean;
}

/** Image sizes */
export interface ImageSizes {
  thumbnail?: string;
  medium?: string;
  large?: string;
  full: string;
}

/** Unified image data */
export interface AnimeImage {
  /** Original source URL */
  sourceUrl: string;
  /** WordPress attachment ID */
  attachmentId?: number;
  /** Alternative sizes if available */
  sizes?: ImageSizes;
  /** CDN optimized URL (i2.wp.com) */
  cdnUrl?: string;
  /** MIME type */
  mimeType?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
}

/** Episode information */
export interface Episode {
  /** Episode ID */
  id: number;
  /** Episode number (extracted from title or data) */
  episodeNumber: number;
  /** Episode title */
  title: string;
  /** URL slug */
  slug: string;
  /** Domain-based episode URL */
  url: string;
  /** Thumbnail image */
  thumbnail?: AnimeImage;
  /** Video sources (multiple qualities) */
  videoSources: VideoSource[];
  /** Download page URL */
  downloadUrl?: string;
  /** Previous episode ID */
  prevEpisodeId?: number;
  /** Previous episode URL */
  prevEpisodeUrl?: string;
  /** Release date */
  date: string;
  /** Last modified date */
  modified: string;
}

/** Anime series/category */
export interface AnimeSeries {
  /** Category ID */
  id: number;
  /** Anime title */
  title: string;
  /** URL slug */
  slug: string;
  /** Category URL */
  url: string;
  /** Number of episodes */
  episodeCount: number;
  /** Cover image */
  coverImage?: AnimeImage;
  /** Anime type: TV, Movie, OVA, etc. */
  type?: string;
  /** Status: Currently Airing, Finished Airing */
  status?: string;
  /** Score/rating */
  score?: string;
  /** Genres */
  genres?: string[];
  /** Synopsis/description */
  synopsis?: string;
  /** Release date range */
  released?: string;
  /** Season (e.g., Winter 2026) */
  season?: string;
  /** Studio */
  studio?: string;
  /** Episodes list (populated when fetched) */
  episodes?: Episode[];
}

/** WordPress Post (Episode) - Raw structure */
export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  meta: Record<string, unknown>;
  categories: number[];
  tags: number[];
  class_list: string[];
  yoast_head?: string;
  _links?: Record<string, unknown>;
}

/** WordPress Category (Anime Series) - Raw structure */
export interface WPCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
  meta: Record<string, unknown>;
  yoast_head?: string;
}

/** WordPress Media (Image) - Raw structure */
export interface WPMedia {
  id: number;
  date: string;
  slug: string;
  type: string;
  link: string;
  title: { rendered: string };
  author: number;
  featured_media: number;
  media_type: string;
  mime_type: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    filesize?: number;
    sizes?: Record<string, {
      file: string;
      width: number;
      height: number;
      mime_type: string;
      source_url: string;
    }>;
  };
  source_url: string;
}

/** APK Endpoint Episode Data */
export interface APKEpisodeData {
  title: string;
  prev?: string;
  thumb?: string;
  download?: string;
  episode: string;
  player: Array<{
    title: string;
    type: string;
    url: string;
  }>;
  comment?: string;
}

/** APK Endpoint Anime Data */
export interface APKAnimeData {
  title: string;
  cover?: string;
  img?: string;
  type?: string;
  duration?: string;
  latest_episode?: {
    episode: boolean | string;
    url: string;
  };
  released?: string;
  status?: string;
  score?: string;
  genre?: Array<{ name: string; link: string }>;
  season?: Array<{ name: string; link: string }>;
  synopsis?: string;
  data?: Array<{
    episode: string;
    url: string;
    download?: string;
    player?: Array<{
      title: string;
      type: string;
      url: string;
    }>;
  }>;
}

/** APK Latest Episode */
export interface APKLatestEpisode {
  title: string;
  url: string;
  img: string;
  type: string;
  score: string;
  genre: string | [] | null;
  data: {
    url: string;
    episode: string;
    time: string;
  };
}

/** Filter options for fetching */
export interface FetchOptions {
  /** Page number */
  page?: number;
  /** Items per page (server may ignore) */
  perPage?: number;
  /** Order by field */
  orderBy?: "date" | "id" | "title" | "slug" | "modified" | "count";
  /** Sort order */
  order?: "asc" | "desc";
  /** Include embedded relations */
  embed?: boolean;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/** API Response wrapper */
export interface APIResponse<T> {
  data: T;
  total: number;
  totalPages: number;
  currentPage: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Set cookies for authentication (Cloudflare bypass)
 */
export function setCookies(cookies: string): void {
  cookieStore = cookies;
}

/**
 * Get cookies if available
 */
export function getCookies(): string | null {
  return cookieStore;
}

/**
 * Extract quality from video title
 */
export function extractQuality(title: string): VideoQuality {
  const lower = title.toLowerCase();
  if (lower.includes("1080p") || lower.includes("1080")) return "1080p";
  if (lower.includes("720p") || lower.includes("720")) return "720p";
  if (lower.includes("480p") || lower.includes("480")) return "480p";
  if (lower.includes("360p") || lower.includes("360")) return "360p";
  return "unknown";
}

/**
 * Extract provider from video title or URL
 */
export function extractProvider(title: string, url?: string): VideoProvider {
  const lower = title.toLowerCase();
  const urlLower = url?.toLowerCase() || "";

  if (lower.includes("wibufile") || urlLower.includes("wibufile")) return "wibufile";
  if (lower.includes("blogspot") || lower.includes("blogger") || urlLower.includes("blogger")) return "blogspot";
  if (lower.includes("mega") || urlLower.includes("mega.nz")) return "mega";
  if (lower.includes("pucuk") || lower.includes("filedon") || urlLower.includes("filedon")) return "filedon";

  return "unknown";
}

/**
 * Extract direct video URL from iframe HTML
 */
export function extractVideoUrl(iframeHtml: string): { embedUrl?: string; directUrl?: string } {
  const srcMatch = iframeHtml.match(/src=["']([^"']+)["']/i);
  if (!srcMatch) return {};

  const embedUrl = srcMatch[1];
  const result: { embedUrl?: string; directUrl?: string } = { embedUrl };

  // Check if it's already a direct MP4
  if (embedUrl.endsWith(".mp4") || embedUrl.includes(".mp4?")) {
    result.directUrl = embedUrl;
  }
  // Check if it's Wibufile direct
  else if (embedUrl.includes("wibufile.com") && embedUrl.includes("/video")) {
    result.directUrl = embedUrl;
  }
  // Check if it's Google Video
  else if (embedUrl.includes("googlevideo.com")) {
    result.directUrl = embedUrl;
  }

  return result;
}

/**
 * Parse video sources from APK player data
 */
export function parseVideoSources(players: Array<{ title: string; type: string; url: string }>): VideoSource[] {
  const sources: VideoSource[] = [];

  for (const player of players) {
    const quality = extractQuality(player.title);
    const provider = extractProvider(player.title);
    const urls = extractVideoUrl(player.url);

    // Determine video type
    let type: VideoType = "embed";
    if (urls.directUrl) {
      type = "direct";
    } else if (urls.embedUrl?.includes("googlevideo.com")) {
      type = "stream";
    }

    sources.push({
      provider,
      quality,
      type,
      embedUrl: urls.embedUrl,
      directUrl: urls.directUrl,
      iframeHtml: player.url,
      available: true,
    });
  }

  return sources;
}

/**
 * Build CDN URL from WordPress URL
 */
export function buildCdnUrl(wpUrl: string): string {
  // Convert to Photon CDN URL
  if (wpUrl.includes("v1.samehadaku.how")) {
    return wpUrl.replace(
      "https://v1.samehadaku.how",
      "https://i2.wp.com/v1.samehadaku.how"
    );
  }
  return wpUrl;
}

/**
 * Parse WordPress image data
 */
export function parseImageData(media: WPMedia | null): AnimeImage | undefined {
  if (!media) return undefined;

  const sizes: ImageSizes = { full: media.source_url };

  if (media.media_details?.sizes) {
    const md = media.media_details.sizes;
    if (md.thumbnail) sizes.thumbnail = md.thumbnail.source_url;
    if (md.medium) sizes.medium = md.medium.source_url;
    if (md.large) sizes.large = md.large.source_url;
  }

  return {
    sourceUrl: media.source_url,
    attachmentId: media.id,
    sizes,
    cdnUrl: buildCdnUrl(media.source_url),
    mimeType: media.mime_type,
    width: media.media_details?.width,
    height: media.media_details?.height,
  };
}

/**
 * Extract episode number from title
 */
export function extractEpisodeNumber(title: string): number {
  // Try "Episode X" pattern
  let match = title.match(/episode\s+(\d+)/i);
  if (match) return parseInt(match[1], 10);

  // Try "- X" pattern
  match = title.match(/-\s*(\d+)(?:\s*\[|$)/);
  if (match) return parseInt(match[1], 10);

  // Try any number in the title
  match = title.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);

  return 0;
}

/**
 * Parse WordPress post to Episode
 */
export function parseEpisodeFromPost(post: WPPost, detailData?: APKEpisodeData): Episode {
  const episodeNumber = extractEpisodeNumber(post.title.rendered);

  let videoSources: VideoSource[] = [];
  let thumbnail: AnimeImage | undefined;
  let downloadUrl: string | undefined;
  let prevEpisodeId: number | undefined;
  let prevEpisodeUrl: string | undefined;

  // If we have detailed data from APK endpoint
  if (detailData) {
    // Parse video sources
    if (detailData.player) {
      videoSources = parseVideoSources(detailData.player);
    }

    // Parse thumbnail
    if (detailData.thumb) {
      thumbnail = {
        sourceUrl: detailData.thumb,
        cdnUrl: buildCdnUrl(detailData.thumb),
      };
    }

    downloadUrl = detailData.download;

    // Parse prev episode
    if (detailData.prev) {
      prevEpisodeUrl = detailData.prev;
      const idMatch = detailData.prev.match(/id=(\d+)/);
      if (idMatch) {
        prevEpisodeId = parseInt(idMatch[1], 10);
      }
    }
  }

  return {
    id: post.id,
    episodeNumber,
    title: post.title.rendered,
    slug: post.slug,
    url: post.link,
    thumbnail,
    videoSources,
    downloadUrl,
    prevEpisodeId,
    prevEpisodeUrl,
    date: post.date,
    modified: post.modified,
  };
}

/**
 * Parse WordPress category to AnimeSeries
 */
export function parseSeriesFromCategory(cat: WPCategory, detailData?: APKAnimeData): AnimeSeries {
  let coverImage: AnimeImage | undefined;
  let type: string | undefined;
  let status: string | undefined;
  let score: string | undefined;
  let genres: string[] | undefined;
  let synopsis: string | undefined;
  let released: string | undefined;
  let season: string | undefined;

  if (detailData) {
    // Parse cover image
    if (detailData.cover || detailData.img) {
      const imgUrl = detailData.cover || detailData.img || "";
      coverImage = {
        sourceUrl: imgUrl,
        cdnUrl: buildCdnUrl(imgUrl),
      };
    }

    type = detailData.type;
    status = detailData.status;
    score = detailData.score;
    released = detailData.released;
    synopsis = detailData.synopsis;

    // Parse genres
    if (detailData.genre) {
      genres = detailData.genre.map(g => g.name);
    }

    // Parse season
    if (detailData.season && detailData.season.length > 0) {
      season = detailData.season[0].name;
    }
  }

  return {
    id: cat.id,
    title: cat.name,
    slug: cat.slug,
    url: cat.link,
    episodeCount: cat.count,
    coverImage,
    type,
    status,
    score,
    genres,
    synopsis,
    released,
    season,
  };
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Generic fetch function with error handling
 */
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<APIResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = getHeaders();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(cookieStore ? { Cookie: cookieStore } : {}),
        ...(options?.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get pagination headers
    const total = parseInt(response.headers.get("X-WP-Total") || "0", 10);
    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "0", 10);

    // Parse URL to get current page
    const urlObj = new URL(url);
    const currentPage = parseInt(urlObj.searchParams.get("page") || "1", 10);

    const data = await response.json() as T;

    return {
      data,
      total,
      totalPages,
      currentPage,
      success: true,
    };
  } catch (error) {
    return {
      data: null as T,
      total: 0,
      totalPages: 0,
      currentPage: 1,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch posts (episodes) with filters
 */
export async function fetchPosts(options: FetchOptions = {}): Promise<APIResponse<WPPost[]>> {
  const params = new URLSearchParams();

  if (options.page) params.set("page", options.page.toString());
  if (options.perPage) params.set("per_page", options.perPage.toString());
  if (options.orderBy) params.set("orderby", options.orderBy);
  if (options.order) params.set("order", options.order);
  if (options.embed) params.set("_embed", "1");

  const query = params.toString();
  return fetchAPI<WPPost[]>(`/wp/v2/posts${query ? `?${query}` : ""}`);
}

/**
 * Fetch single post by ID
 */
export async function fetchPostById(id: number, embed: boolean = true): Promise<APIResponse<WPPost>> {
  const params = embed ? "?_embed=1" : "";
  return fetchAPI<WPPost>(`/wp/v2/posts/${id}${params}`);
}

/**
 * Fetch posts by category (anime series episodes)
 */
export async function fetchPostsByCategory(
  categoryId: number,
  options: FetchOptions = {}
): Promise<APIResponse<WPPost[]>> {
  const params = new URLSearchParams();
  params.set("categories", categoryId.toString());

  if (options.page) params.set("page", options.page.toString());
  if (options.perPage) params.set("per_page", options.perPage.toString());
  if (options.orderBy) params.set("orderby", options.orderBy);
  if (options.order) params.set("order", options.order);
  if (options.embed) params.set("_embed", "1");

  return fetchAPI<WPPost[]>(`/wp/v2/posts?${params.toString()}`);
}

/**
 * Fetch posts by date range
 */
export async function fetchPostsByDateRange(
  after: string,
  before: string,
  options: FetchOptions = {}
): Promise<APIResponse<WPPost[]>> {
  const params = new URLSearchParams();
  params.set("after", after);
  params.set("before", before);

  if (options.page) params.set("page", options.page.toString());
  if (options.orderBy) params.set("orderby", options.orderBy);
  if (options.order) params.set("order", options.order);

  return fetchAPI<WPPost[]>(`/wp/v2/posts?${params.toString()}`);
}

/**
 * Fetch modified posts since date
 */
export async function fetchModifiedPosts(
  since: string,
  options: FetchOptions = {}
): Promise<APIResponse<WPPost[]>> {
  const params = new URLSearchParams();
  params.set("modified_after", since);

  if (options.page) params.set("page", options.page.toString());
  if (options.orderBy) params.set("orderby", options.orderBy);
  if (options.order) params.set("order", options.order);

  return fetchAPI<WPPost[]>(`/wp/v2/posts?${params.toString()}`);
}

/**
 * Search posts
 * Note: Uses standard WordPress search (searches in title and content)
 */
export async function searchPosts(
  query: string,
  options: FetchOptions = {}
): Promise<APIResponse<WPPost[]>> {
  const params = new URLSearchParams();
  params.set("search", query);

  if (options.page) params.set("page", options.page.toString());
  if (options.perPage) params.set("per_page", options.perPage.toString());
  if (options.orderBy) params.set("orderby", options.orderBy);
  if (options.order) params.set("order", options.order);
  if (options.embed) params.set("_embed", "1");

  return fetchAPI<WPPost[]>(`/wp/v2/posts?${params.toString()}`);
}

/**
 * Fetch categories (anime series list)
 */
export async function fetchCategories(options: FetchOptions = {}): Promise<APIResponse<WPCategory[]>> {
  const params = new URLSearchParams();

  if (options.page) params.set("page", options.page.toString());
  if (options.perPage) params.set("per_page", options.perPage.toString());
  if (options.orderBy) params.set("orderby", options.orderBy);
  if (options.order) params.set("order", options.order);

  return fetchAPI<WPCategory[]>(`/wp/v2/categories?${params.toString()}`);
}

/**
 * Fetch single category by ID
 */
export async function fetchCategoryById(id: number): Promise<APIResponse<WPCategory>> {
  return fetchAPI<WPCategory>(`/wp/v2/categories/${id}`);
}

/**
 * Fetch category by slug
 */
export async function fetchCategoryBySlug(slug: string): Promise<APIResponse<WPCategory[]>> {
  return fetchAPI<WPCategory[]>(`/wp/v2/categories?slug=${encodeURIComponent(slug)}`);
}

/**
 * Fetch media (image) by ID
 */
export async function fetchMediaById(id: number): Promise<APIResponse<WPMedia>> {
  return fetchAPI<WPMedia>(`/wp/v2/media/${id}`);
}

/**
 * Fetch APK episode detail
 */
export async function fetchAPKEpisodeDetail(id: number): Promise<APKEpisodeData | null> {
  try {
    const response = await fetch(`${BASE_URL}/apk/episode?id=${id}`, {
      headers: getHeaders(),
      ...(cookieStore ? { headers: { ...getHeaders(), Cookie: cookieStore } } : {}),
    });

    if (!response.ok) return null;
    return await response.json() as APKEpisodeData;
  } catch {
    return null;
  }
}

/**
 * Fetch APK anime detail
 */
export async function fetchAPKAnimeDetail(id: number): Promise<APKAnimeData | null> {
  try {
    const response = await fetch(`${BASE_URL}/apk/anime?id=${id}`, {
      headers: getHeaders(),
      ...(cookieStore ? { headers: { ...getHeaders(), Cookie: cookieStore } } : {}),
    });

    if (!response.ok) return null;
    const data = await response.json() as APKAnimeData[];
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}

/**
 * Fetch APK latest episodes
 */
export async function fetchAPKLatest(): Promise<APIResponse<APKLatestEpisode[]>> {
  return fetchAPI<APKLatestEpisode[]>("/apk/latest");
}

/**
 * Fetch APK ongoing anime
 */
export async function fetchAPKOngoing(): Promise<APIResponse<APKLatestEpisode[]>> {
  return fetchAPI<APKLatestEpisode[]>("/apk/ongoing");
}

/**
 * Fetch APK popular anime
 */
export async function fetchAPKPopular(): Promise<APIResponse<APKLatestEpisode[]>> {
  return fetchAPI<APKLatestEpisode[]>("/apk/populer");
}

/**
 * Fetch APK search results
 */
export async function fetchAPKSearch(query: string, page: number = 1): Promise<APIResponse<APKLatestEpisode[]>> {
  return fetchAPI<APKLatestEpisode[]>(`/apk/search?s=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ""}`);
}

/**
 * Fetch APK genre list
 */
export async function fetchAPKGenres(): Promise<APIResponse<any[]>> {
  return fetchAPI<any[]>("/apk/genre");
}

/**
 * Fetch APK anime by genre
 */
export async function fetchAPKAnimeByGenre(genre: string, page: number = 1): Promise<APIResponse<APKLatestEpisode[]>> {
  return fetchAPI<APKLatestEpisode[]>(`/apk/filter?genre=${encodeURIComponent(genre)}${page > 1 ? `&page=${page}` : ""}`);
}

// ============================================================================
// HIGH-LEVEL COMBINED FUNCTIONS
// ============================================================================

/**
 * Get complete episode with all details and video sources
 */
export async function getCompleteEpisode(episodeId: number): Promise<Episode | null> {
  // Fetch WordPress post data
  const postResponse = await fetchPostById(episodeId, false);
  if (!postResponse.success || Array.isArray(postResponse.data)) {
    return null;
  }

  const post = postResponse.data as WPPost;

  // Fetch APK detail for video sources
  const apkDetail = await fetchAPKEpisodeDetail(episodeId);

  // Fetch featured media if available
  if (post.featured_media && !apkDetail?.thumb) {
    const mediaResponse = await fetchMediaById(post.featured_media);
    if (mediaResponse.success && !Array.isArray(mediaResponse.data)) {
      const media = mediaResponse.data as WPMedia;
      // You can extend parseEpisodeFromPost to accept media data
    }
  }

  return parseEpisodeFromPost(post, apkDetail || undefined);
}

/**
 * Get complete anime series with all episodes
 */
export async function getCompleteSeries(categoryId: number): Promise<AnimeSeries | null> {
  // Fetch category info
  const catResponse = await fetchCategoryById(categoryId);
  if (!catResponse.success || Array.isArray(catResponse.data)) {
    return null;
  }

  const category = catResponse.data as WPCategory;

  // Try to find anime ID from category info
  // Note: This is a simplified approach, you might need to adjust based on actual data structure
  let animeDetail: APKAnimeData | null = null;

  // Fetch episodes
  const episodesResponse = await fetchPostsByCategory(categoryId, {
    perPage: 100,
    orderBy: "date",
    order: "desc",
  });

  if (!episodesResponse.success) {
    return parseSeriesFromCategory(category);
  }

  const posts = episodesResponse.data as WPPost[];

  // Fetch episode details in parallel (limited)
  const episodes: Episode[] = [];
  for (const post of posts.slice(0, 10)) { // Limit to first 10 to avoid rate limiting
    const episode = await getCompleteEpisode(post.id);
    if (episode) episodes.push(episode);
  }

  const series = parseSeriesFromCategory(category, animeDetail || undefined);
  series.episodes = episodes;

  return series;
}

/**
 * Get latest episodes with full details
 */
export async function getLatestEpisodes(count: number = 10): Promise<Episode[]> {
  const response = await fetchAPKLatest();
  if (!response.success) return [];

  const latest = response.data as APKLatestEpisode[];
  const episodes: Episode[] = [];

  for (const item of latest.slice(0, count)) {
    // Extract episode ID from URL
    const idMatch = item.data.url.match(/id=(\d+)/);
    if (idMatch) {
      const episodeId = parseInt(idMatch[1], 10);
      const episode = await getCompleteEpisode(episodeId);
      if (episode) episodes.push(episode);
    }
  }

  return episodes;
}

/**
 * Search anime with unified results
 */
export async function searchAnime(query: string): Promise<{ series: AnimeSeries[]; episodes: Episode[] }> {
  const results = { series: [] as AnimeSeries[], episodes: [] as Episode[] };

  // Search in categories (anime series)
  const catResponse = await fetchCategories({
    orderBy: "title",
    order: "asc",
  });

  if (catResponse.success && Array.isArray(catResponse.data)) {
    const categories = catResponse.data as WPCategory[];
    const matchingCats = categories.filter(cat =>
      cat.name.toLowerCase().includes(query.toLowerCase())
    );

    for (const cat of matchingCats.slice(0, 5)) {
      const series = parseSeriesFromCategory(cat);
      results.series.push(series);
    }
  }

  // Search in posts (episodes)
  const postResponse = await searchPosts(query);
  if (postResponse.success && Array.isArray(postResponse.data)) {
    const posts = postResponse.data as WPPost[];

    for (const post of posts.slice(0, 5)) {
      const episode = parseEpisodeFromPost(post);
      results.episodes.push(episode);
    }
  }

  return results;
}

/**
 * Collect all anime series (with pagination handling)
 */
export async function collectAllSeries(
  onProgress?: (current: number, total: number) => void
): Promise<AnimeSeries[]> {
  const allSeries: AnimeSeries[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) { // Limit to 10 pages to avoid overloading
    const response = await fetchCategories({
      page,
      perPage: 100,
      orderBy: "title",
      order: "asc",
    });

    if (!response.success || !Array.isArray(response.data)) {
      break;
    }

    const categories = response.data as WPCategory[];

    for (const cat of categories) {
      const series = parseSeriesFromCategory(cat);
      allSeries.push(series);
    }

    onProgress?.(allSeries.length, response.total);

    hasMore = page < response.totalPages;
    page++;

    // Rate limiting
    if (hasMore) await new Promise(r => setTimeout(r, 500));
  }

  return allSeries;
}

/**
 * Collect all episodes for a series
 */
export async function collectAllEpisodes(
  categoryId: number,
  onProgress?: (current: number, total: number) => void
): Promise<Episode[]> {
  const allEpisodes: Episode[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPostsByCategory(categoryId, {
      page,
      perPage: 100,
      orderBy: "date",
      order: "desc",
    });

    if (!response.success || !Array.isArray(response.data)) {
      break;
    }

    const posts = response.data as WPPost[];

    for (const post of posts) {
      const episode = await getCompleteEpisode(post.id);
      if (episode) allEpisodes.push(episode);
    }

    onProgress?.(allEpisodes.length, response.total);

    hasMore = page < response.totalPages;
    page++;

    // Rate limiting
    if (hasMore) await new Promise(r => setTimeout(r, 1000));
  }

  return allEpisodes;
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Configuration
  setCookies,
  getCookies,
  BASE_URL,

  // Utility functions
  extractQuality,
  extractProvider,
  extractVideoUrl,
  extractEpisodeNumber,
  parseVideoSources,
  parseImageData,
  parseEpisodeFromPost,
  parseSeriesFromCategory,
  buildCdnUrl,

  // API fetch functions
  fetchPosts,
  fetchPostById,
  fetchPostsByCategory,
  fetchPostsByDateRange,
  fetchModifiedPosts,
  searchPosts,
  fetchCategories,
  fetchCategoryById,
  fetchCategoryBySlug,
  fetchMediaById,
  fetchAPKEpisodeDetail,
  fetchAPKAnimeDetail,
  fetchAPKLatest,
  fetchAPKOngoing,
  fetchAPKPopular,
  fetchAPKSearch,
  fetchAPKGenres,
  fetchAPKAnimeByGenre,

  // High-level functions
  getCompleteEpisode,
  getCompleteSeries,
  getLatestEpisodes,
  searchAnime,
  collectAllSeries,
  collectAllEpisodes,
};

// Re-export types
export * from "./samehadakuHelper";
