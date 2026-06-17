/**
 * LK21 Scraper Helper using UltraHTML
 * Compatible with: Cloudflare Workers, Bun, Deno, Node.js
 */

import { parse, TEXT_NODE } from 'ultrahtml';
import { querySelectorAll as ultraQuerySelectorAll } from 'ultrahtml/selector';

// ============================================================================
// HELPER: Handle complex selectors with commas
// ============================================================================

function querySelectorAll(node: any, selector: string): any[] {
  if (!selector.includes(',')) {
    return ultraQuerySelectorAll(node, selector);
  }

  const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
  const results: any[] = [];
  const seen = new Set<string>();

  for (const sel of selectors) {
    try {
      const elements = ultraQuerySelectorAll(node, sel);
      for (const el of elements) {
        const key = el.loc ? JSON.stringify(el.loc) : Math.random().toString();
        if (!seen.has(key)) {
          seen.add(key);
          results.push(el);
        }
      }
    } catch (e) {
      // Ignore invalid selectors
    }
  }

  return results;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Movie {
  id: string;
  title: string;
  slug: string;
  poster?: string;
  backdrop?: string;
  rating?: string;
  year?: string;
  quality?: string;
  duration?: string;
  type?: 'movie' | 'series';
  genres?: string[];
  country?: string;
  director?: string;
  actors?: string[];
  synopsis?: string;
  streamingUrl?: string;
  downloadLinks?: DownloadLink[];
  url: string;
}

export interface Series extends Movie {
  totalSeasons?: string;
  totalEpisodes?: string;
  episodes?: Episode[];
}

export interface Episode {
  number: string;
  title?: string;
  streamingUrl?: string;
}

export interface DownloadLink {
  quality: string;
  url: string;
  size?: string;
}

export interface Genre {
  slug: string;
  name: string;
  url: string;
}

export interface Country {
  slug: string;
  name: string;
  url: string;
}

export interface Year {
  year: string;
  url: string;
}

export interface Pagination {
  currentPage: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: Pagination;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_BASE_URL = 'https://tv7.lk21official.cc';
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface Config {
  baseUrl: string;
  userAgent: string;
  timeout?: number;
  cacheTtl?: number;
}

let globalConfig: Config = {
  baseUrl: DEFAULT_BASE_URL,
  userAgent: DEFAULT_USER_AGENT,
  timeout: 30000,
  cacheTtl: 300 // 5 minutes default cache
};

// Simple in-memory cache for Cloudflare Workers
const cache = new Map<string, { data: any; expiry: number }>();

function getCacheKey(url: string): string {
  return `lk21:${url}`;
}

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }
  return cached.data as T;
}

function setCache<T>(key: string, data: T, ttlSeconds = globalConfig.cacheTtl || 300): void {
  cache.set(key, {
    data,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

export function configure(config: Partial<Config>): void {
  globalConfig = { ...globalConfig, ...config };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function fetchHtml(url: string, retries = 2): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': globalConfig.userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': globalConfig.baseUrl,
    'Origin': globalConfig.baseUrl,
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'Priority': 'u=0, i',
  };

  // Try fetch with retries
  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, {
        headers,
        redirect: 'follow',
        // @ts-ignore - cloudflare workers specific
        cf: {
          cacheTtl: 0,
          cacheEverything: false,
        }
      });

      // Handle 403 specifically
      if (response.status === 403) {
        console.warn(`[LK21] 403 Forbidden for ${url} (attempt ${i + 1})`);
        
        // Wait before retry with exponential backoff
        if (i < retries) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        
        throw new Error(`Access denied (403). The site may be blocking Cloudflare IP or requires browser verification.`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      
      // Check for Cloudflare challenge
      if (text.includes('cf-browser-verification') || 
          text.includes('Checking your browser') ||
          text.includes('Just a moment') ||
          text.includes('cf-im-under-attack')) {
        throw new Error('Cloudflare challenge detected - cannot bypass from server');
      }
      
      // Check for rate limiting
      if (text.includes('rate limit') || text.includes('too many requests')) {
        if (i < retries) {
          await new Promise(r => setTimeout(r, 2000 * (i + 1)));
          continue;
        }
        throw new Error('Rate limited by target site');
      }
      
      return text;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's a 403 after all retries
      if (i < retries && !lastError.message.includes('403')) {
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries');
}

async function parseHtml(html: string) {
  return await parse(html);
}

function getTextContent(node: any): string {
  if (!node) return '';
  if (node.type === TEXT_NODE) {
    return node.value || '';
  }
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(getTextContent).join('');
  }
  return '';
}

function text(node: any): string {
  if (!node) return '';
  if (Array.isArray(node)) {
    return node.length > 0 ? text(node[0]) : '';
  }
  return getTextContent(node).trim();
}

function getAttribute(name: string, node: any): string | undefined {
  if (!node || !node.attributes) return undefined;
  return node.attributes[name];
}

function extractText(node: any, selector: string): string | undefined {
  if (!node) return undefined;
  try {
    const elements = querySelectorAll(node, selector);
    if (elements.length === 0) return undefined;
    const result = text(elements[0]).trim();
    return result || undefined;
  } catch (e) {
    return undefined;
  }
}

function extractAttr(node: any, selector: string, attr: string): string | undefined {
  if (!node) return undefined;
  try {
    const elements = querySelectorAll(node, selector);
    if (elements.length === 0) return undefined;
    return getAttribute(attr, elements[0]) || undefined;
  } catch (e) {
    return undefined;
  }
}

function extractSlug(url: string): string {
  return url.split('/').filter(Boolean).pop() || '';
}

function buildUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${globalConfig.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

function isSeriesFromCard(card: any): boolean {
  // Check for series indicators
  const duration = extractText(card, '.duration');
  const season = extractText(card, '.season');
  const episode = extractText(card, '.episode');
  const type = extractText(card, '.type');
  
  return !!(
    duration?.toLowerCase().includes('s.') ||
    duration?.toLowerCase().includes('season') ||
    duration?.toLowerCase().includes('eps') ||
    season ||
    episode ||
    type?.toLowerCase().includes('series') ||
    type?.toLowerCase().includes('tv')
  );
}

function parseContentCard(card: any): Movie | null {
  const linkEls = querySelectorAll(card, 'a');
  const imgEls = querySelectorAll(card, 'img');
  
  let linkEl: any = null;
  let href = '';
  for (const link of linkEls) {
    const h = getAttribute('href', link) || '';
    if (h && !h.startsWith('#') && !h.startsWith('javascript:')) {
      linkEl = link;
      href = h;
      break;
    }
  }
  
  if (!linkEl || !href) return null;

  const slug = extractSlug(href);
  if (!slug || slug.length < 2) return null;
  
  // Skip if it's a category/genre/country/year link
  if (href.includes('/genre/') || href.includes('/country/') || href.includes('/year/')) {
    return null;
  }
  
  let title = getAttribute('title', linkEl) || '';
  
  if (!title) {
    for (const sel of ['h2', 'h3', '.entry-title', '.title']) {
      const els = querySelectorAll(card, sel);
      if (els.length > 0) {
        title = text(els[0]);
        if (title) break;
      }
    }
  }
  
  if (!title && imgEls.length > 0) {
    title = getAttribute('alt', imgEls[0]) || '';
  }
  
  if (!title) {
    title = text(linkEl);
  }
  
  title = title.trim();
  if (!title || title.length < 2) return null;
  
  // Clean up title - remove "Nonton series" or "Nonton film" prefix
  title = title
    .replace(/^Nonton series\s+/i, '')
    .replace(/^Nonton film\s+/i, '')
    .replace(/\s+streaming gratis$/i, '')
    .replace(/\s+subtitle indonesia$/i, '')
    .trim();

  const imgEl = imgEls[0];
  const isSeries = isSeriesFromCard(card);

  return {
    id: slug,
    slug,
    title,
    type: isSeries ? 'series' : 'movie',
    poster: imgEl ? (getAttribute('src', imgEl) || getAttribute('data-src', imgEl) || getAttribute('data-original', imgEl)) : undefined,
    rating: extractText(card, '.rating'),
    year: extractText(card, '.year'),
    quality: extractText(card, '.quality'),
    duration: extractText(card, '.duration'),
    genres: querySelectorAll(card, '.genre').map(el => text(el)).filter(Boolean),
    url: buildUrl(href)
  };
}

function extractPagination(ast: any, currentPage: number): Pagination {
  const nextLinks = querySelectorAll(ast, '.pagination .next');
  const paginationLinks = querySelectorAll(ast, '.pagination a');
  const hasLastPageLink = paginationLinks.length > 0 && 
    text(paginationLinks[paginationLinks.length - 1]).toLowerCase().includes('next');
  const hasNextPageLink = querySelectorAll(ast, `a[href*="page=${currentPage + 1}"]`).length > 0;
  const hasNext = nextLinks.length > 0 || hasLastPageLink || hasNextPageLink;

  const prevLinks = querySelectorAll(ast, '.pagination .prev');
  const previousLinks = querySelectorAll(ast, '.pagination .previous');
  const hasPrev = currentPage > 1 || prevLinks.length > 0 || previousLinks.length > 0;

  let allPaginationLinks = paginationLinks.concat(querySelectorAll(ast, '.page-numbers'));
  let totalPages: number | undefined;

  for (const link of allPaginationLinks) {
    const pageNum = parseInt(text(link));
    if (!isNaN(pageNum) && pageNum > (totalPages || 0)) {
      totalPages = pageNum;
    }
  }

  return {
    currentPage,
    totalPages,
    hasNext,
    hasPrev
  };
}

// ============================================================================
// CONTENT ENDPOINTS
// ============================================================================

async function fetchWithFallback(path: string, useCache = true): Promise<{ html: string; baseUrl: string }> {
  const cacheKey = getCacheKey(path);
  
  // Try cache first
  if (useCache) {
    const cached = getFromCache<{ html: string; baseUrl: string }>(cacheKey);
    if (cached) {
      console.log(`[LK21] Cache hit for ${path}`);
      return cached;
    }
  }
  
  // Use configured base URL
  try {
    const url = `${globalConfig.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    console.log(`[LK21] Fetching ${url}`);
    const html = await fetchHtml(url);
    console.log(`[LK21] Success, html length: ${html.length}`);
    
    // Check if html is valid
    if (!html || html.length < 100) {
      throw new Error('Empty or too short response');
    }
    
    const result = { html, baseUrl: globalConfig.baseUrl };
    
    // Cache successful result
    if (useCache) {
      setCache(cacheKey, result, globalConfig.cacheTtl);
    }
    
    return result;
  } catch (error) {
    const errMsg = (error as Error).message;
    console.log(`[LK21] Failed: ${errMsg}`);
    throw new Error(`Fetch failed: ${errMsg}`);
  }
}

export async function getLatest(page: number = 1): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `latest:${page}`;
  
  // Check cache
  const cached = getFromCache<ApiResponse<Movie[]>>(cacheKey);
  if (cached) {
    console.log(`[LK21] getLatest using cache, items: ${cached.data.length}`);
    return cached;
  }
  
  try {
    const path = page > 1 ? `/?page=${page}` : `/`;
    const { html, baseUrl } = await fetchWithFallback(path);
    console.log(`[LK21] Parsing HTML from ${baseUrl}`);
    const ast = await parseHtml(html);

    const items: Movie[] = [];
    let cards: any[] = [];
    const selectors = ['article.post', 'article', '.film-list article', '.film-list .item'];
    
    for (const sel of selectors) {
      cards = querySelectorAll(ast, sel);
      console.log(`[LK21] Selector "${sel}": ${cards.length} items`);
      if (cards.length > 0) break;
    }

    console.log(`[LK21] Total cards found: ${cards.length}`);

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const item = parseContentCard(card);
      if (item) {
        // Update URL to use working domain
        item.url = item.url.replace(globalConfig.baseUrl, baseUrl);
        items.push(item);
        if (items.length <= 3) {
          console.log(`[LK21] Parsed item ${items.length}: ${item.title}`);
        }
      } else {
        if (i < 3) {
          console.log(`[LK21] Failed to parse card ${i}`);
        }
      }
    }

    console.log(`[LK21] Total items parsed: ${items.length}`);

    const result: ApiResponse<Movie[]> = {
      success: true,
      data: items,
      pagination: extractPagination(ast, page)
    };
    
    // Cache result
    setCache(cacheKey, result, 60); // 1 minute cache for latest
    
    return result;
  } catch (error) {
    console.log(`[LK21] getLatest error: ${(error as Error).message}`);
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

export async function getMovies(page: number = 1): Promise<ApiResponse<Movie[]>> {
  try {
    const result = await getLatest(page);
    if (!result.success) return result;
    
    // Filter only movies
    const movies = result.data.filter(item => item.type === 'movie');
    
    return {
      success: true,
      data: movies,
      pagination: result.pagination
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

export async function getSeries(page: number = 1): Promise<ApiResponse<Series[]>> {
  try {
    const result = await getLatest(page);
    if (!result.success) return result as ApiResponse<Series[]>;
    
    // Filter only series
    const series = result.data
      .filter(item => item.type === 'series')
      .map(item => ({
        ...item,
        totalSeasons: item.duration?.match(/S\.(\d+)/)?.[1]
      } as Series));
    
    return {
      success: true,
      data: series,
      pagination: result.pagination
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

export async function getAllContent(page: number = 1): Promise<ApiResponse<Movie[]>> {
  return await getLatest(page);
}

// ============================================================================
// DETAIL ENDPOINTS
// ============================================================================

export async function getMovieDetail(slug: string): Promise<ApiResponse<Movie>> {
  const cacheKey = `movie:${slug}`;
  const url = buildUrl(`/${slug}/`);
  
  const cached = getFromCache<ApiResponse<Movie>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const path = `/${slug}/`;
    const { html, baseUrl } = await fetchWithFallback(path);
    const ast = await parseHtml(html);

    // Check if it's a redirect page
    const titleCheck = text(querySelectorAll(ast, 'title')[0] || {});
    if (titleCheck.includes('dialihkan') || titleCheck.includes('redirect')) {
      // Try to extract actual movie info from the page
      const metaRefresh = querySelectorAll(ast, 'meta[http-equiv="refresh"]');
      if (metaRefresh.length > 0) {
        // This is a redirect page, try alternative approach
        return {
          success: true,
          data: {
            id: slug,
            slug,
            title: slug.replace(/-/g, ' '),
            url
          } as Movie
        };
      }
    }

    const titleEls = querySelectorAll(ast, 'h1').length > 0
      ? querySelectorAll(ast, 'h1')
      : querySelectorAll(ast, '.entry-title');
    const posterEls = querySelectorAll(ast, '.poster img').length > 0
      ? querySelectorAll(ast, '.poster img')
      : querySelectorAll(ast, '.thumb img');
    let synopsisEls = querySelectorAll(ast, '.synopsis');
    if (synopsisEls.length === 0) synopsisEls = querySelectorAll(ast, '.desc');
    if (synopsisEls.length === 0) synopsisEls = querySelectorAll(ast, '[itemprop="description"]');
    const iframeEls = querySelectorAll(ast, 'iframe');

    const titleEl = titleEls[0];
    const posterEl = posterEls[0];
    const synopsisEl = synopsisEls[0];
    const iframeEl = iframeEls[0];

    let genreEls = querySelectorAll(ast, '.genre');
    if (genreEls.length === 0) genreEls = querySelectorAll(ast, '[itemprop="genre"]');
    const directorEls = querySelectorAll(ast, '.director').length > 0
      ? querySelectorAll(ast, '.director')
      : querySelectorAll(ast, '[itemprop="director"]');
    let actorEls = querySelectorAll(ast, '.actor');
    if (actorEls.length === 0) actorEls = querySelectorAll(ast, '[itemprop="actor"]');
    const ratingEls = querySelectorAll(ast, '.rating').length > 0
      ? querySelectorAll(ast, '.rating')
      : querySelectorAll(ast, '[itemprop="ratingValue"]');
    const yearEls = querySelectorAll(ast, '.year');
    const qualityEls = querySelectorAll(ast, '.quality');
    const durationEls = querySelectorAll(ast, '.duration');
    const countryEls = querySelectorAll(ast, '.country');

    let title = titleEl ? text(titleEl) : slug;
    // Clean up title
    title = title
      .replace(/^Nonton\s+/i, '')
      .replace(/\s+streaming.*$/i, '')
      .replace(/\s+subtitle.*$/i, '')
      .trim();

    const movie: Movie = {
      id: slug,
      slug,
      title,
      poster: posterEl ? (getAttribute('src', posterEl) || getAttribute('data-src', posterEl)) : undefined,
      rating: ratingEls.length > 0 ? text(ratingEls[0]) : undefined,
      year: yearEls.length > 0 ? text(yearEls[0]) : undefined,
      quality: qualityEls.length > 0 ? text(qualityEls[0]) : undefined,
      duration: durationEls.length > 0 ? text(durationEls[0]) : undefined,
      country: countryEls.length > 0 ? text(countryEls[0]) : undefined,
      genres: genreEls.map(el => text(el)).filter(g => g && !g.includes('Selengkapnya')),
      director: directorEls.length > 0 ? text(directorEls[0]) : undefined,
      actors: actorEls.map(el => text(el)).filter(Boolean),
      synopsis: synopsisEl ? text(synopsisEl) : undefined,
      streamingUrl: iframeEl ? getAttribute('src', iframeEl) : undefined,
      url
    };

    const result = {
      success: true,
      data: movie
    };
    
    // Cache for 10 minutes
    setCache(cacheKey, result, 600);
    
    return result;
  } catch (error) {
    return {
      success: false,
      data: {} as Movie,
      error: (error as Error).message
    };
  }
}

export async function getSeriesDetail(slug: string): Promise<ApiResponse<Series>> {
  try {
    // First try to get as movie detail
    const movieResult = await getMovieDetail(slug);
    if (!movieResult.success) {
      return movieResult as ApiResponse<Series>;
    }

    const url = buildUrl(`/${slug}/`);
    const html = await fetchHtml(url);
    const ast = await parseHtml(html);

    // Try to find episodes
    const episodes: Episode[] = [];
    const episodeEls = querySelectorAll(ast, '.episode');
    if (episodeEls.length === 0) {
      // Try alternative selectors
      const altEps = querySelectorAll(ast, '.ep-item');
      altEps.forEach((ep, idx) => {
        const iframe = querySelectorAll(ep, 'iframe')[0];
        episodes.push({
          number: String(idx + 1),
          title: extractText(ep, '.ep-title'),
          streamingUrl: iframe ? getAttribute('src', iframe) : undefined
        });
      });
    } else {
      episodeEls.forEach((ep, idx) => {
        const iframe = querySelectorAll(ep, 'iframe')[0];
        episodes.push({
          number: extractText(ep, '.ep-number') || String(idx + 1),
          title: extractText(ep, '.ep-title'),
          streamingUrl: iframe ? getAttribute('src', iframe) : undefined
        });
      });
    }

    const series: Series = {
      ...movieResult.data,
      totalSeasons: extractText(ast, '.total-season'),
      totalEpisodes: extractText(ast, '.total-episode') || String(episodes.length),
      episodes: episodes.length > 0 ? episodes : undefined
    };

    return {
      success: true,
      data: series
    };
  } catch (error) {
    return {
      success: false,
      data: {} as Series,
      error: (error as Error).message
    };
  }
}

// ============================================================================
// FILTER ENDPOINTS
// ============================================================================

export async function getGenres(): Promise<ApiResponse<Genre[]>> {
  const cacheKey = `genres:list`;
  
  const cached = getFromCache<ApiResponse<Genre[]>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const { html, baseUrl } = await fetchWithFallback(`/`);
    const ast = await parseHtml(html);

    const genres: Genre[] = [];
    let genreLinks = querySelectorAll(ast, '.genre a');
    if (genreLinks.length === 0) genreLinks = querySelectorAll(ast, 'a[href*="/genre/"]');

    for (const link of genreLinks) {
      const href = getAttribute('href', link);
      const name = text(link);
      if (href && name && name.length > 1 && name.length < 50) {
        const slug = extractSlug(href);
        if (slug && href.includes('/genre/')) {
          genres.push({
            slug,
            name,
            url: buildUrl(href)
          });
        }
      }
    }

    const result = {
      success: true,
      data: genres
    };
    
    setCache(cacheKey, result, 3600); // 1 hour cache
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

export async function getCountries(): Promise<ApiResponse<Country[]>> {
  const cacheKey = `countries:list`;
  
  const cached = getFromCache<ApiResponse<Country[]>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const { html, baseUrl } = await fetchWithFallback(`/`);
    const ast = await parseHtml(html);

    const countries: Country[] = [];
    let countryLinks = querySelectorAll(ast, '.country a');
    if (countryLinks.length === 0) countryLinks = querySelectorAll(ast, 'a[href*="/country/"]');

    for (const link of countryLinks) {
      const href = getAttribute('href', link);
      const name = text(link);
      if (href && name && name.length > 1 && name.length < 50) {
        const slug = extractSlug(href);
        if (slug && href.includes('/country/')) {
          countries.push({
            slug,
            name,
            url: buildUrl(href)
          });
        }
      }
    }

    const result = {
      success: true,
      data: countries
    };
    
    setCache(cacheKey, result, 3600); // 1 hour cache
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

export async function getYears(): Promise<ApiResponse<Year[]>> {
  const cacheKey = `years:list`;
  
  const cached = getFromCache<ApiResponse<Year[]>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const { html, baseUrl } = await fetchWithFallback(`/`);
    const ast = await parseHtml(html);

    const years: Year[] = [];
    let yearLinks = querySelectorAll(ast, '.year a');
    if (yearLinks.length === 0) yearLinks = querySelectorAll(ast, 'a[href*="/year/"]');

    for (const link of yearLinks) {
      const href = getAttribute('href', link);
      const yearText = text(link);
      if (href && /^\d{4}$/.test(yearText)) {
        years.push({
          year: yearText,
          url: buildUrl(href)
        });
      }
    }

    years.sort((a, b) => parseInt(b.year) - parseInt(a.year));

    const result = {
      success: true,
      data: years
    };
    
    setCache(cacheKey, result, 3600); // 1 hour cache
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

export async function getMoviesByGenre(genreSlug: string, page: number = 1): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `genre:${genreSlug}:${page}`;
  
  const cached = getFromCache<ApiResponse<Movie[]>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const path = page > 1 ? `/genre/${genreSlug}?page=${page}` : `/genre/${genreSlug}`;
    const { html, baseUrl } = await fetchWithFallback(path);
    const ast = await parseHtml(html);

    const movies: Movie[] = [];
    let cards: any[] = [];
    const selectors = ['article.post', 'article', '.film-list article', '.film-list .item'];
    
    for (const sel of selectors) {
      cards = querySelectorAll(ast, sel);
      if (cards.length > 0) break;
    }

    for (const card of cards) {
      const item = parseContentCard(card);
      if (item) {
        movies.push(item);
      }
    }

    const result = {
      success: true,
      data: movies,
      pagination: extractPagination(ast, page)
    };
    
    setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

export async function getMoviesByCountry(countrySlug: string, page: number = 1): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `country:${countrySlug}:${page}`;
  
  const cached = getFromCache<ApiResponse<Movie[]>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const path = page > 1 ? `/country/${countrySlug}?page=${page}` : `/country/${countrySlug}`;
    const { html, baseUrl } = await fetchWithFallback(path);
    const ast = await parseHtml(html);

    const movies: Movie[] = [];
    let cards: any[] = [];
    const selectors = ['article.post', 'article', '.film-list article', '.film-list .item'];
    
    for (const sel of selectors) {
      cards = querySelectorAll(ast, sel);
      if (cards.length > 0) break;
    }

    for (const card of cards) {
      const item = parseContentCard(card);
      if (item) {
        movies.push(item);
      }
    }

    const result = {
      success: true,
      data: movies,
      pagination: extractPagination(ast, page)
    };
    
    setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

export async function getMoviesByYear(year: string, page: number = 1): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `year:${year}:${page}`;
  
  const cached = getFromCache<ApiResponse<Movie[]>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const path = page > 1 ? `/year/${year}?page=${page}` : `/year/${year}`;
    const { html, baseUrl } = await fetchWithFallback(path);
    const ast = await parseHtml(html);

    const movies: Movie[] = [];
    let cards: any[] = [];
    const selectors = ['article.post', 'article', '.film-list article', '.film-list .item'];
    
    for (const sel of selectors) {
      cards = querySelectorAll(ast, sel);
      if (cards.length > 0) break;
    }

    for (const card of cards) {
      const item = parseContentCard(card);
      if (item) {
        movies.push(item);
      }
    }

    const result = {
      success: true,
      data: movies,
      pagination: extractPagination(ast, page)
    };
    
    setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

// ============================================================================
// SEARCH ENDPOINT
// ============================================================================

export async function search(query: string, page: number = 1): Promise<ApiResponse<Movie[]>> {
  const cacheKey = `search:${query}:${page}`;
  
  const cached = getFromCache<ApiResponse<Movie[]>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const path = `/?s=${encodeURIComponent(query)}`;
    const { html, baseUrl } = await fetchWithFallback(path, false);
    const ast = await parseHtml(html);

    const results: Movie[] = [];
    let resultItems: any[] = [];
    const selectors = ['.result-item', '.search-item', 'article.post', 'article'];
    
    for (const sel of selectors) {
      resultItems = querySelectorAll(ast, sel);
      if (resultItems.length > 0) break;
    }

    for (const item of resultItems) {
      const movie = parseContentCard(item);
      if (movie) {
        results.push(movie);
      }
    }

    const result = {
      success: true,
      data: results,
      pagination: extractPagination(ast, page)
    };
    
    // Cache search for 1 minute only
    setCache(cacheKey, result, 60);
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

// ============================================================================
// RELATED MOVIES
// ============================================================================

export async function getRelatedMovies(slug: string): Promise<ApiResponse<Movie[]>> {
  try {
    const path = `/${slug}/`;
    const { html, baseUrl } = await fetchWithFallback(path);
    const ast = await parseHtml(html);

    const movies: Movie[] = [];
    let relatedSection: any = null;
    
    // Find related section
    const sections = querySelectorAll(ast, '.related, .related-movies, .you-may-like');
    if (sections.length > 0) {
      relatedSection = sections[0];
    }

    if (relatedSection) {
      let cards: any[] = [];
      const selectors = ['article', '.item', '.post'];
      
      for (const sel of selectors) {
        cards = querySelectorAll(relatedSection, sel);
        if (cards.length > 0) break;
      }

      for (const card of cards) {
        const movie = parseContentCard(card);
        if (movie) {
          movies.push(movie);
        }
      }
    }

    return {
      success: true,
      data: movies
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: (error as Error).message
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const LK21Helper = {
  // Config
  configure,

  // Content
  getLatest,
  getMovies,
  getSeries,
  getAllContent,

  // Detail
  getMovieDetail,
  getSeriesDetail,
  getRelatedMovies,

  // Search
  search,

  // Filters
  getGenres,
  getMoviesByGenre,
  getCountries,
  getMoviesByCountry,
  getYears,
  getMoviesByYear,
};

