import bahinIndex from "../data/bahin.json"

type ContentType = "movie" | "tv" | "episode"

const typeEndpoints: Record<ContentType, string> = {
  movie: "/wp/v2/posts",
  tv: "/wp/v2/tv",
  episode: "/wp/v2/episode",
}

const baseOrigin = ("http:\/\/159.65.94.170").replace(/\/$/, "")
const apiRoot = `${baseOrigin}/wp-json`

export type RenderedField = { rendered: string; protected?: boolean }

export type RebahinContent = {
  modified: string | number | Date
  id: number
  date: string
  slug: string
  type: string
  link: string
  title: RenderedField
  content: RenderedField
  excerpt?: RenderedField
  featured_media?: number
  categories?: number[]
  tags?: number[]
  muvidirector?: number[]
  muvicast?: number[]
  muviyear?: number[]
  muvicountry?: number[]
  muviquality?: number[]
  muviindex?: number[]
  muvinetwork?: number[]
  muviduration?: number[]
  yoast_head?: string
  yoast_head_json?: {
    og_image?: Array<{ url: string; width?: number; height?: number }>
    thumbnailUrl?: string
  }
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      id: number
      source_url: string
      media_details?: {
        sizes?: {
          full?: { source_url: string }
          medium?: { source_url: string }
          thumbnail?: { source_url: string }
        }
      }
    }>
  }
}

// Content dengan image URL yang sudah diekstrak
export type RebahinContentWithImage = RebahinContent & {
  image_url: string | null
  image_thumb?: string | null
  image_medium?: string | null
}

// Content dengan views
export type RebahinContentWithViews = RebahinContentWithImage & {
  views: number
}

export type RebahinQuery = {
  search?: string
  slug?: string
  page?: number
  perPage?: number
  order?: "asc" | "desc"
  orderBy?: "date" | "modified" | "title" | "id" | "slug" | "relevance" | "include_slugs" | string
  categories?: number | number[]
  tags?: number | number[]
  muvidirector?: number | number[]
  muvicast?: number | number[]
  muviyear?: number | number[]
  muvicountry?: number | number[]
  muviquality?: number | number[]
  muviindex?: number | number[]
  muvinetwork?: number | number[]
  embed?: boolean // Tambahkan _embed untuk mendapatkan featured media
  exclude?: number[] // Exclude specific post IDs
}

export type SortOption = "new" | "hot" | "views" | "rating" | "recommendations" | "modified" | "title"

export type RequestOptions = {
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  /**
   * Additional headers to send to Rebahin upstream.
   * Use this to forward client headers (UA, cookies, accept-language) when running behind Cloudflare.
   */
  headers?: HeadersInit
  /**
   * Client headers to selectively forward (user-agent, accept-language, cookie).
   */
  forwardHeaders?: HeadersInit
}

// Taxonomy Types
export type RebahinCategory = {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string
  taxonomy: string
  parent?: number
  meta?: any[]
}

export type RebahinCountry = {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string
  taxonomy: string
  meta?: any[]
}

export type TaxonomyQuery = {
  page?: number
  perPage?: number
  order?: "asc" | "desc"
  orderBy?: "id" | "include" | "name" | "slug" | "include_slugs" | "term_group" | "description" | "count"
  search?: string
  slug?: string | string[]
}

type StreamingSource = "content" | "page"

export type StreamingEmbed = {
  src: string
  iframe: string
  source: StreamingSource
}


const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const FORWARD_HEADER_KEYS = ["user-agent", "accept-language", "cookie", "accept"]

const pickForwardHeaders = (source?: HeadersInit) => {
  if (!source) return {}
  const src = new Headers(source as any)
  const picked: Record<string, string> = {}
  FORWARD_HEADER_KEYS.forEach((key) => {
    const value = src.get(key)
    if (value) picked[key] = value
  })
  return picked
}

const mergeHeaders = (base: HeadersInit, options?: RequestOptions) => {
  const merged: Record<string, string> = {
    ...(base as Record<string, string>),
    // Default safety headers to bypass basic WAF checks
    referer: baseOrigin,
    origin: baseOrigin,
    "x-requested-with": "XMLHttpRequest",
  }

  Object.assign(merged, pickForwardHeaders(options?.forwardHeaders))
  Object.assign(merged, options?.headers as Record<string, string> | undefined)

  return merged
}

const toCsv = (value?: number | number[] | string | string[] | boolean) => {
  if (value === undefined || typeof value === "boolean") return undefined
  const values = Array.isArray(value) ? value : [value]
  return values.map(String).join(",")
}

const buildQueryString = (query?: RebahinQuery) => {
  if (!query) return ""

  const params = new URLSearchParams()

  const set = (key: string, value?: string | number) => {
    if (value === undefined || value === null) return
    params.set(key, String(value))
  }

  set("search", query.search)
  set("slug", query.slug)
  set("page", query.page)
  set("per_page", query.perPage ? Math.min(Math.max(query.perPage, 1), 100) : undefined)
  set("order", query.order)
  set("orderby", query.orderBy)

  // Add _embed parameter untuk mendapatkan featured media
  if (query.embed) {
    params.set("_embed", "")
  }

  const arrayKeys: Array<[keyof RebahinQuery, string]> = [
    ["categories", "categories"],
    ["tags", "tags"],
    ["muvidirector", "muvidirector"],
    ["muvicast", "muvicast"],
    ["muviyear", "muviyear"],
    ["muvicountry", "muvicountry"],
    ["muviquality", "muviquality"],
    ["muviindex", "muviindex"],
    ["muvinetwork", "muvinetwork"],
    ["exclude", "exclude"],
  ]

  for (const [key, paramName] of arrayKeys) {
    const csv = toCsv(query[key])
    if (csv) params.set(paramName, csv)
  }

  return params.toString()
}

const requestJson = async <T>(
  endpoint: string,
  query?: RebahinQuery,
  options?: RequestOptions,
): Promise<T> => {
  const qs = buildQueryString(query)
  const url = `${apiRoot}${endpoint}${qs ? `?${qs}` : ""}`

  const res = await (options?.fetchImpl ?? fetch)(url, {
    method: "GET",
    headers: mergeHeaders(
      {
        accept: "application/json",
        "User-Agent": DEFAULT_UA,
      },
      options,
    ),
    signal: options?.signal,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Rebahin request failed (${res.status}): ${body.slice(0, 200)}`)
  }

  return res.json() as Promise<T>
}

const fetchHtml = async (url: string, options?: RequestOptions) => {
  const res = await (options?.fetchImpl ?? fetch)(url, {
    headers: mergeHeaders(
      {
        "User-Agent": DEFAULT_UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      options,
    ),
    signal: options?.signal,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Rebahin page fetch failed (${res.status}): ${body.slice(0, 200)}`)
  }

  return res.text()
}

const normalizeEmbedSrc = (src: string) => {
  const trimmed = src.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  return trimmed
}

export const extractEmbeds = (html: string, source: StreamingSource): StreamingEmbed[] => {
  if (!html) return []
  const embeds: StreamingEmbed[] = []
  const seen = new Set<string>()
  const iframeRegex = /<iframe[^>]*?(?:src|data-src)=["']([^"']+)["'][^>]*>/gi

  let match: RegExpExecArray | null
  while ((match = iframeRegex.exec(html))) {
    const rawSrc = normalizeEmbedSrc(match[1])
    if (!rawSrc || seen.has(rawSrc)) continue
    seen.add(rawSrc)
    embeds.push({ src: rawSrc, iframe: match[0], source })
  }

  return embeds
}

export type ImageSize = "full" | "medium" | "thumbnail" | "source"

export type RebahinImage = {
  url: string
  width?: number
  height?: number
}

/**
 * Extract image URL dari RebahinContent
 * Prioritas:
 * 1. _embedded.wp:featuredmedia (jika embed=true)
 * 2. yoast_head_json.og_image atau thumbnailUrl
 * 3. Parse dari content.rendered
 */
export const extractImage = (
  content: RebahinContent,
  size: ImageSize = "source"
): RebahinImage | null => {
  // 1. Coba ambil dari _embedded (jika menggunakan embed=true)
  const featuredMedia = content._embedded?.["wp:featuredmedia"]?.[0]
  if (featuredMedia?.source_url) {
    if (size === "source") {
      return { url: featuredMedia.source_url }
    }
    const sizes = featuredMedia.media_details?.sizes
    if (sizes?.[size]) {
      return { url: sizes[size]!.source_url }
    }
    return { url: featuredMedia.source_url }
  }

  // 2. Coba ambil dari yoast_head_json
  if (content.yoast_head_json) {
    const yoast = content.yoast_head_json
    // og_image adalah array
    if (yoast.og_image?.[0]?.url) {
      return {
        url: yoast.og_image[0].url,
        width: yoast.og_image[0].width,
        height: yoast.og_image[0].height,
      }
    }
    // thumbnailUrl
    if (yoast.thumbnailUrl) {
      return { url: yoast.thumbnailUrl }
    }
  }

  // 3. Coba parse dari yoast_head (fallback)
  if (content.yoast_head) {
    const ogImageMatch = content.yoast_head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/)
    if (ogImageMatch) {
      return { url: ogImageMatch[1] }
    }
  }

  // 4. Coba parse dari content.rendered
  if (content.content?.rendered) {
    const imgMatch = content.content.rendered.match(/<img[^>]+src=["']([^"']+)["']/)
    if (imgMatch) {
      return { url: imgMatch[1] }
    }
  }

  return null
}

/**
 * Batch fetch images untuk multiple content
 * Menggunakan Promise.all untuk fetch paralel
 */
export const fetchImagesBatch = async (
  contents: RebahinContent[],
  size: ImageSize = "source",
  options?: RequestOptions
): Promise<Map<number, RebahinImage>> => {
  const imageMap = new Map<number, RebahinImage>()
  
  // Extract yang sudah tersedia (dari embed atau yoast)
  const needFetch: { content: RebahinContent; index: number }[] = []
  
  contents.forEach((content, index) => {
    const existing = extractImage(content, size)
    if (existing) {
      imageMap.set(content.id, existing)
    } else if (content.featured_media) {
      needFetch.push({ content, index })
    }
  })
  
  // Fetch yang belum ada gambar (gunakan media endpoint)
  if (needFetch.length > 0) {
    const fetchPromises = needFetch.map(async ({ content }) => {
      try {
        const url = `${apiRoot}/wp/v2/media/${content.featured_media}`
        const res = await fetch(url, { headers: mergeHeaders({ accept: "application/json" }, options) })
        if (!res.ok) return null
        const media = await res.json() as {
          source_url: string
          media_details?: { sizes?: Record<string, { source_url: string }> }
        }
        
        let imageUrl = media.source_url
        if (size !== "source" && media.media_details?.sizes?.[size]) {
          imageUrl = media.media_details.sizes[size].source_url
        }
        
        return { id: content.id, image: { url: imageUrl } }
      } catch {
        return null
      }
    })
    
    const results = await Promise.all(fetchPromises)
    results.forEach((result) => {
      if (result) {
        imageMap.set(result.id, result.image)
      }
    })
  }
  
  return imageMap
}

/**
 * Get post views by ID
 * Endpoint: /post-views-counter/get-post-views/{id}
 */
export const getPostViews = async (
  id: number | number[],
  options?: RequestOptions
): Promise<Map<number, number>> => {
  const ids = Array.isArray(id) ? id : [id]
  const url = `${apiRoot}/post-views-counter/get-post-views/${ids.join(",")}`
  
  try {
    const res = await (options?.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: mergeHeaders({ accept: "application/json" }, options),
      signal: options?.signal,
    })
    
    if (!res.ok) {
      console.warn(`[Rebahin] Failed to fetch views: ${res.status}`)
      return new Map(ids.map(i => [i, 0]))
    }
    
    const data = await res.json() as Record<string, number>
    const viewsMap = new Map<number, number>()
    
    // API returns object with post IDs as keys
    for (const [postId, views] of Object.entries(data)) {
      viewsMap.set(Number(postId), views || 0)
    }
    
    // Fill missing IDs with 0
    ids.forEach(i => {
      if (!viewsMap.has(i)) viewsMap.set(i, 0)
    })
    
    return viewsMap
  } catch (error) {
    console.warn("[Rebahin] Error fetching views:", error)
    return new Map(ids.map(i => [i, 0]))
  }
}

/**
 * Attach views to content list
 */
export const attachViews = async (
  contents: RebahinContent[],
  options?: RequestOptions
): Promise<RebahinContentWithViews[]> => {
  if (contents.length === 0) return []
  
  const ids = contents.map(c => c.id)
  const viewsMap = await getPostViews(ids, options)
  
  return contents.map(content => {
    const image = extractImage(content)
    const thumb = extractImage(content, "thumbnail")
    const medium = extractImage(content, "medium")
    
    return {
      ...content,
      image_url: image?.url || null,
      image_thumb: thumb?.url || null,
      image_medium: medium?.url || null,
      views: viewsMap.get(content.id) || 0,
    }
  })
}

const resolvePageUrl = (
  item: Pick<RebahinContent, "link" | "slug" | "type">,
  fallback: ContentType,
) => {
  if (item.link) return item.link

  const path = fallback === "tv" ? `tv/${item.slug}` : fallback === "episode" ? `eps/${item.slug}` : item.slug
  return `${baseOrigin}/${path.replace(/^\/+/, "")}/`
}

export const listContent = async (
  type: ContentType,
  query?: RebahinQuery,
  options?: RequestOptions,
): Promise<RebahinContent[]> => {
  const endpoint = typeEndpoints[type]
  return requestJson<RebahinContent[]>(endpoint, query, options)
}

export const listMovies = async (
  query?: RebahinQuery,
  options?: RequestOptions
): Promise<RebahinContent[]> => listContent("movie", query, options)

export const listTv = async (
  query?: RebahinQuery,
  options?: RequestOptions
): Promise<RebahinContent[]> => listContent("tv", query, options)

/**
 * List movies dengan image URL yang sudah diekstrak
 */
export const listMoviesWithImages = async (
  query?: RebahinQuery,
  options?: RequestOptions
): Promise<RebahinContentWithImage[]> => {
  const movies = await listContent("movie", query, options)
  return attachImages(movies)
}

/**
 * List TV dengan image URL yang sudah diekstrak
 */
export const listTvWithImages = async (
  query?: RebahinQuery,
  options?: RequestOptions
): Promise<RebahinContentWithImage[]> => {
  const tv = await listContent("tv", query, options)
  return attachImages(tv)
}

/**
 * Search movies by keyword
 * Returns movies with image URLs that match the search query
 * 
 * @param keyword - Search keyword
 * @param query - Optional additional query params (page, perPage, etc)
 * @param options - Request options
 * @returns Movies matching the search keyword with images
 */
export const searchMovies = async (
  keyword: string,
  query?: Omit<RebahinQuery, "search">,
  options?: RequestOptions
): Promise<RebahinContentWithImage[]> => {
  const searchQuery: RebahinQuery = {
    ...query,
    search: keyword,
    perPage: query?.perPage ? Math.min(query.perPage, 100) : 20,
  }
  
  const movies = await listContent("movie", searchQuery, options)
  return attachImages(movies)
}

/**
 * Search TV shows by keyword
 * Returns TV shows with image URLs that match the search query
 * 
 * @param keyword - Search keyword
 * @param query - Optional additional query params (page, perPage, etc)
 * @param options - Request options
 * @returns TV shows matching the search keyword with images
 */
export const searchTv = async (
  keyword: string,
  query?: Omit<RebahinQuery, "search">,
  options?: RequestOptions
): Promise<RebahinContentWithImage[]> => {
  const searchQuery: RebahinQuery = {
    ...query,
    search: keyword,
    perPage: query?.perPage ? Math.min(query.perPage, 100) : 20,
  }
  
  const tv = await listContent("tv", searchQuery, options)
  return attachImages(tv)
}

export const getContent = async (
  type: ContentType,
  idOrSlug: number | string,
  options?: RequestOptions,
): Promise<RebahinContent | null> => {
  const endpoint = typeEndpoints[type]
  try {
    if (typeof idOrSlug === "number") {
      return await requestJson<RebahinContent>(`${endpoint}/${idOrSlug}`, undefined, options)
    }

    const hits = await listContent(type, { slug: idOrSlug, perPage: 1 }, options)
    return hits[0] ?? null
  } catch (error) {
    console.warn("Rebahin getContent error", error)
    return null
  }
}

export const getStreamingEmbeds = async (
  type: ContentType,
  idOrSlug: number | string,
  options?: RequestOptions & { content?: RebahinContent },
): Promise<{ content: RebahinContent | null; embeds: StreamingEmbed[] }> => {
  const content = options?.content ?? (await getContent(type, idOrSlug, options))
  if (!content) return { content: null, embeds: [] }

  const fromContent = extractEmbeds(content.content?.rendered ?? "", "content")
  if (fromContent.length) return { content, embeds: fromContent }

  const pageUrl = resolvePageUrl(content, type)
  const html = await fetchHtml(pageUrl, options)
  return { content, embeds: extractEmbeds(html, "page") }
}

export const rebahinBase = {
  origin: baseOrigin,
  apiRoot,
  endpoints: { ...typeEndpoints },
}

// Taxonomy Endpoints
const buildTaxonomyQueryString = (query?: TaxonomyQuery) => {
  if (!query) return ""
  const params = new URLSearchParams()
  
  if (query.page) params.set("page", String(query.page))
  if (query.perPage) params.set("per_page", String(Math.min(Math.max(query.perPage, 1), 100)))
  if (query.order) params.set("order", query.order)
  if (query.orderBy) params.set("orderby", query.orderBy)
  if (query.search) params.set("search", query.search)
  if (query.slug) {
    const slugs = Array.isArray(query.slug) ? query.slug : [query.slug]
    params.set("slug", slugs.join(","))
  }
  
  return params.toString()
}

/**
 * Get list of categories (genres)
 * Endpoint: /wp/v2/categories
 */
export const getCategories = async (
  query?: TaxonomyQuery,
  options?: RequestOptions
): Promise<RebahinCategory[]> => {
  const qs = buildTaxonomyQueryString(query)
  const url = `${apiRoot}/wp/v2/categories${qs ? `?${qs}` : ""}`
  
  const res = await (options?.fetchImpl ?? fetch)(url, {
    method: "GET",
    headers: mergeHeaders({ accept: "application/json" }, options),
    signal: options?.signal,
  })
  
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Failed to fetch categories (${res.status}): ${body.slice(0, 200)}`)
  }
  
  return res.json() as Promise<RebahinCategory[]>
}

/**
 * Get single category by ID
 */
export const getCategory = async (
  id: number,
  options?: RequestOptions
): Promise<RebahinCategory | null> => {
  try {
    const url = `${apiRoot}/wp/v2/categories/${id}`
    const res = await (options?.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: mergeHeaders({ accept: "application/json" }, options),
      signal: options?.signal,
    })
    
    if (!res.ok) return null
    return res.json() as Promise<RebahinCategory>
  } catch (error) {
    console.warn("Rebahin getCategory error", error)
    return null
  }
}

/**
 * Get list of countries
 * Endpoint: /wp/v2/muvicountry
 */
export const getCountries = async (
  query?: TaxonomyQuery,
  options?: RequestOptions
): Promise<RebahinCountry[]> => {
  const qs = buildTaxonomyQueryString(query)
  const url = `${apiRoot}/wp/v2/muvicountry${qs ? `?${qs}` : ""}`
  
  const res = await (options?.fetchImpl ?? fetch)(url, {
    method: "GET",
    headers: mergeHeaders({ accept: "application/json" }, options),
    signal: options?.signal,
  })
  
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Failed to fetch countries (${res.status}): ${body.slice(0, 200)}`)
  }
  
  return res.json() as Promise<RebahinCountry[]>
}

/**
 * Get single country by ID
 */
export const getCountry = async (
  id: number,
  options?: RequestOptions
): Promise<RebahinCountry | null> => {
  try {
    const url = `${apiRoot}/wp/v2/muvicountry/${id}`
    const res = await (options?.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: mergeHeaders({ accept: "application/json" }, options),
      signal: options?.signal,
    })
    
    if (!res.ok) return null
    return res.json() as Promise<RebahinCountry>
  } catch (error) {
    console.warn("Rebahin getCountry error", error)
    return null
  }
}

/**
 * Sort content manually by specified option
 * Note: API Rebahin tidak mendukung orderby=rating/hot secara native,
 * jadi ini akan fetch data kemudian sort di client-side
 */
export const sortContent = (
  content: RebahinContent[],
  sortBy: SortOption,
  order: "asc" | "desc" = "desc"
): RebahinContent[] => {
  const sorted = [...content]

  switch (sortBy) {
    case "new":
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      break
    case "modified":
      sorted.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
      break
    case "title":
      sorted.sort((a, b) => a.title.rendered.localeCompare(b.title.rendered))
      break
    case "hot":
      // Sort by ID (anggap ID tinggi = lebih baru/populer)
      sorted.sort((a, b) => b.id - a.id)
      break
    case "views":
      // Sort by views (requires RebahinContentWithViews)
      sorted.sort((a, b) => ((b as RebahinContentWithViews).views || 0) - ((a as RebahinContentWithViews).views || 0))
      break
    case "rating":
      // API tidak menyediakan rating, fallback ke ID
      console.warn("[Rebahin] Rating sorting tidak tersedia di API, menggunakan fallback ke ID")
      sorted.sort((a, b) => b.id - a.id)
      break
    case "recommendations":
      // Random shuffle untuk recommendations
      sorted.sort(() => Math.random() - 0.5)
      break
  }

  return order === "asc" ? sorted.reverse() : sorted
}

/**
 * Helper untuk menambahkan image URL ke content
 */
export const attachImages = (
  contents: RebahinContent[],
  size: ImageSize = "source"
): RebahinContentWithImage[] => {
  return contents.map((content) => {
    const image = extractImage(content, size)
    const thumb = extractImage(content, "thumbnail")
    const medium = extractImage(content, "medium")
    
    return {
      ...content,
      image_url: image?.url || null,
      image_thumb: thumb?.url || null,
      image_medium: medium?.url || null,
    }
  })
}

/**
 * List content dengan sorting option custom + image URL
 * Mengambil data, sort di client-side, dan tambahkan image URL
 */
export const listContentSorted = async (
  type: ContentType,
  sortBy: SortOption,
  query?: Omit<RebahinQuery, "orderBy" | "order">,
  options?: RequestOptions
): Promise<RebahinContentWithImage[]> => {
  // Ambil lebih banyak data untuk sorting yang akurat
  const fetchQuery: RebahinQuery = {
    ...query,
    perPage: query?.perPage ? Math.min(query.perPage * 2, 100) : 50,
  }

  const content = await listContent(type, fetchQuery, options)
  
  // Sort hasil
  const sorted = sortContent(content, sortBy, "desc")
  
  // Limit ke perPage yang diminta
  const limit = query?.perPage || 10
  const limited = sorted.slice(0, limit)
  
  // Tambahkan image URL
  return attachImages(limited)
}

/**
 * List content sorted by VIEWS (most viewed)
 * Mengambil data, fetch views dari API, sort by views desc
 */
export const listContentByViews = async (
  type: ContentType,
  query?: Omit<RebahinQuery, "orderBy" | "order">,
  options?: RequestOptions
): Promise<RebahinContentWithViews[]> => {
  // Ambil lebih banyak data untuk sorting yang akurat
  const fetchQuery: RebahinQuery = {
    ...query,
    perPage: query?.perPage ? Math.min(query.perPage * 3, 100) : 60, // Ambil lebih banyak karena views bervariasi
  }

  const content = await listContent(type, fetchQuery, options)
  
  // Attach views (fetch dari post-views-counter API)
  const withViews = await attachViews(content, options)
  
  // Sort by views
  const sorted = withViews.sort((a, b) => b.views - a.views)
  
  // Limit ke perPage yang diminta
  const limit = query?.perPage || 10
  return sorted.slice(0, limit)
}

/**
 * List new releases - movies dari tahun sekarang, sorted by date terbaru
 * Otomatis filter berdasarkan tahun sekarang dengan cara:
 * 1. Fetch taxonomy muviyear untuk dapatkan ID tahun sekarang
 * 2. Gunakan ID tersebut untuk filter movies
 * 
 * @param query - Optional query (perPage, dll)
 * @param options - Request options
 * @returns Movies dari tahun ini, sorted by date terbaru
 */
export const listNewReleases = async (
  query?: Omit<RebahinQuery, "orderBy" | "order" | "muviyear">,
  options?: RequestOptions
): Promise<RebahinContentWithImage[]> => {
  const currentYear = new Date().getFullYear()
  
  try {
    // Step 1: Fetch taxonomy muviyear untuk dapatkan ID tahun sekarang
    const yearTaxonomyUrl = `${apiRoot}/wp/v2/muviyear?slug=${currentYear}`
    const yearRes = await (options?.fetchImpl ?? fetch)(yearTaxonomyUrl, {
      method: "GET",
      headers: mergeHeaders({ accept: "application/json" }, options),
      signal: options?.signal,
    })
    
    let yearId: number | undefined
    if (yearRes.ok) {
      const yearData = await yearRes.json() as Array<{ id: number; name: string; slug: string }>
      if (yearData.length > 0) {
        yearId = yearData[0].id
      }
    }
    
    // Step 2: Fetch movies dengan filter tahun (jika ID ditemukan)
    const fetchQuery: RebahinQuery = {
      ...query,
      orderBy: "date",
      order: "desc",
      perPage: query?.perPage ? Math.min(query.perPage, 100) : 20,
    }
    
    // Jika ada year ID, filter by year
    if (yearId) {
      fetchQuery.muviyear = yearId
    }
    
    const movies = await listContent("movie", fetchQuery, options)
    
    // Jika tidak ada year ID, filter manual dari date
    if (!yearId) {
      const filtered = movies.filter(m => {
        const movieYear = new Date(m.date).getFullYear()
        return movieYear === currentYear
      })
      return attachImages(filtered.slice(0, query?.perPage || 20))
    }
    
    return attachImages(movies)
  } catch (error) {
    console.warn("[Rebahin] Failed to fetch new releases:", error)
    // Fallback: fetch recent movies dan filter manual by date
    const fallbackQuery: RebahinQuery = {
      ...query,
      orderBy: "date",
      order: "desc",
      perPage: query?.perPage ? Math.min(query.perPage * 2, 100) : 40,
    }
    const movies = await listContent("movie", fallbackQuery, options)
    const filtered = movies.filter(m => {
      const movieYear = new Date(m.date).getFullYear()
      return movieYear === currentYear
    }).slice(0, query?.perPage || 20)
    
    return attachImages(filtered)
  }
}

// Taxonomy Types untuk Detail
export type RebahinTaxonomyItem = {
  id: number
  name: string
  slug: string
}

// Detail Movie dengan informasi lengkap
export type RebahinMovieDetail = {
  id: number
  slug: string
  title: string
  content: string
  excerpt?: string
  date: string
  modified: string
  type: string
  link: string
  image_url: string | null
  image_thumb: string | null
  image_medium: string | null
  views: number
  // Metadata
  year?: RebahinTaxonomyItem[]
  country?: RebahinTaxonomyItem[]
  quality?: RebahinTaxonomyItem[]
  director?: RebahinTaxonomyItem[]
  cast?: RebahinTaxonomyItem[]
  genre?: RebahinTaxonomyItem[]
  network?: RebahinTaxonomyItem[]
  duration?: RebahinTaxonomyItem[]
  // Streaming
  embeds: StreamingEmbed[]
  // Related
  related?: RebahinContentWithImage[]
}

// Query untuk related content
export type RelatedQuery = {
  perPage?: number
  exclude?: number[] // Exclude specific IDs
  sameGenre?: boolean // Fetch dengan genre yang sama
  sameYear?: boolean // Fetch dengan year yang sama
}

/**
 * Fetch taxonomy items by IDs
 */
const fetchTaxonomyItems = async (
  taxonomy: string,
  ids: number[],
  options?: RequestOptions
): Promise<RebahinTaxonomyItem[]> => {
  if (!ids.length) return []
  
  try {
    const url = `${apiRoot}/wp/v2/${taxonomy}?include=${ids.join(",")}`
    const res = await (options?.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: mergeHeaders({ accept: "application/json" }, options),
      signal: options?.signal,
    })
    
    if (!res.ok) return []
    
    const data = await res.json() as Array<{ id: number; name: string; slug: string }>
    return data.map(item => ({ id: item.id, name: item.name, slug: item.slug }))
  } catch (error) {
    console.warn(`[Rebahin] Failed to fetch ${taxonomy}:`, error)
    return []
  }
}

/**
 * Get related movies by genre/year
 */
export const getRelatedMovies = async (
  content: RebahinContent,
  query?: RelatedQuery,
  options?: RequestOptions
): Promise<RebahinContentWithImage[]> => {
  const perPage = query?.perPage || 6
  const excludeIds = query?.exclude || [content.id]
  
  const relatedQuery: RebahinQuery = {
    perPage: perPage + excludeIds.length, // Ambil lebih banyak karena akan difilter
    exclude: excludeIds,
    embed: true, // Untuk gambar
  }
  
  // Filter by same genre jika ada
  if (query?.sameGenre && content.categories?.length) {
    relatedQuery.categories = content.categories
  }
  
  // Filter by same year jika ada
  if (query?.sameYear && content.muviyear?.length) {
    relatedQuery.muviyear = content.muviyear[0] // Ambil year pertama
  }
  
  try {
    const movies = await listContent("movie", relatedQuery, options)
    // Filter out excluded IDs dan limit hasil
    const filtered = movies
      .filter(m => !excludeIds.includes(m.id))
      .slice(0, perPage)
    
    return attachImages(filtered)
  } catch (error) {
    console.warn("[Rebahin] Failed to fetch related movies:", error)
    return []
  }
}

/**
 * Get movie detail lengkap dengan metadata, embeds, dan related movies
 * 
 * @param idOrSlug - ID atau slug movie
 * @param options - Optional config untuk include related movies
 * @returns RebahinMovieDetail atau null jika tidak ditemukan
 */
export const getMovieDetail = async (
  idOrSlug: number | string,
  options?: RequestOptions & {
    includeRelated?: boolean
    relatedQuery?: RelatedQuery
  }
): Promise<RebahinMovieDetail | null> => {
  // 1. Fetch content dasar
  const content = await getContent("movie", idOrSlug, options)
  if (!content) return null
  
  // 2. Extract image
  const image = extractImage(content, "source")
  const thumb = extractImage(content, "thumbnail")
  const medium = extractImage(content, "medium")
  
  // 3. Get views
  const viewsMap = await getPostViews(content.id, options)
  const views = viewsMap.get(content.id) || 0
  
  // 4. Fetch taxonomy metadata (parallel)
  const [
    year,
    country,
    quality,
    director,
    cast,
    genre,
    network,
    duration,
  ] = await Promise.all([
    fetchTaxonomyItems("muviyear", content.muviyear || [], options),
    fetchTaxonomyItems("muvicountry", content.muvicountry || [], options),
    fetchTaxonomyItems("muviquality", content.muviquality || [], options),
    fetchTaxonomyItems("muvidirector", content.muvidirector || [], options),
    fetchTaxonomyItems("muvicast", content.muvicast || [], options),
    fetchTaxonomyItems("categories", content.categories || [], options),
    fetchTaxonomyItems("muvinetwork", content.muvinetwork || [], options),
    fetchTaxonomyItems("muviduration", content.muviduration || [], options),
  ])
  
  // 5. Get streaming embeds
  const { embeds } = await getStreamingEmbeds("movie", content.id, { 
    ...options, 
    content 
  })
  
  // 6. Get related movies (optional)
  let related: RebahinContentWithImage[] | undefined
  if (options?.includeRelated) {
    related = await getRelatedMovies(content, {
      perPage: 6,
      sameGenre: true,
      ...options.relatedQuery,
      exclude: [content.id, ...(options.relatedQuery?.exclude || [])],
    }, options)
  }
  
  return {
    id: content.id,
    slug: content.slug,
    title: content.title.rendered,
    content: content.content?.rendered || "",
    excerpt: content.excerpt?.rendered || "",
    date: content.date,
    modified: content.modified as string,
    type: content.type,
    link: content.link,
    image_url: image?.url || null,
    image_thumb: thumb?.url || null,
    image_medium: medium?.url || null,
    views,
    year,
    country,
    quality,
    director,
    cast,
    genre,
    network,
    duration,
    embeds,
    related,
  }
}

/**
 * Get TV detail lengkap dengan metadata, embeds, dan related TV shows
 * Sama seperti getMovieDetail tapi untuk TV
 */
export const getTvDetail = async (
  idOrSlug: number | string,
  options?: RequestOptions & {
    includeRelated?: boolean
    relatedQuery?: RelatedQuery
  }
): Promise<RebahinMovieDetail | null> => {
  // 1. Fetch content dasar
  const content = await getContent("tv", idOrSlug, options)
  if (!content) return null
  
  // 2. Extract image
  const image = extractImage(content, "source")
  const thumb = extractImage(content, "thumbnail")
  const medium = extractImage(content, "medium")
  
  // 3. Get views
  const viewsMap = await getPostViews(content.id, options)
  const views = viewsMap.get(content.id) || 0
  
  // 4. Fetch taxonomy metadata (parallel)
  const [
    year,
    country,
    quality,
    director,
    cast,
    genre,
    network,
    duration,
  ] = await Promise.all([
    fetchTaxonomyItems("muviyear", content.muviyear || [], options),
    fetchTaxonomyItems("muvicountry", content.muvicountry || [], options),
    fetchTaxonomyItems("muviquality", content.muviquality || [], options),
    fetchTaxonomyItems("muvidirector", content.muvidirector || [], options),
    fetchTaxonomyItems("muvicast", content.muvicast || [], options),
    fetchTaxonomyItems("categories", content.categories || [], options),
    fetchTaxonomyItems("muvinetwork", content.muvinetwork || [], options),
    fetchTaxonomyItems("muviduration", content.muviduration || [], options),
  ])
  
  // 5. Get streaming embeds
  const { embeds } = await getStreamingEmbeds("tv", content.id, { 
    ...options, 
    content 
  })
  
  // 6. Get related TV shows (optional)
  let related: RebahinContentWithImage[] | undefined
  if (options?.includeRelated) {
    const relatedQuery: RebahinQuery = {
      perPage: (options.relatedQuery?.perPage || 6) + 1,
      embed: true,
    }
    
    if (options.relatedQuery?.sameGenre && content.categories?.length) {
      relatedQuery.categories = content.categories
    }
    if (options.relatedQuery?.sameYear && content.muviyear?.length) {
      relatedQuery.muviyear = content.muviyear[0]
    }
    
    try {
      const tvShows = await listContent("tv", relatedQuery, options)
      related = attachImages(
        tvShows
          .filter(t => t.id !== content.id)
          .slice(0, options.relatedQuery?.perPage || 6)
      )
    } catch (error) {
      console.warn("[Rebahin] Failed to fetch related TV shows:", error)
    }
  }
  
  return {
    id: content.id,
    slug: content.slug,
    title: content.title.rendered,
    content: content.content?.rendered || "",
    excerpt: content.excerpt?.rendered || "",
    date: content.date,
    modified: content.modified as string,
    type: content.type,
    link: content.link,
    image_url: image?.url || null,
    image_thumb: thumb?.url || null,
    image_medium: medium?.url || null,
    views,
    year,
    country,
    quality,
    director,
    cast,
    genre,
    network,
    duration,
    embeds,
    related,
  }
}

export const Rebahin = {
  listMovies,
  listContent,
  listTv,
  listMoviesWithImages,
  listTvWithImages,
  listContentByViews,
  listNewReleases,
  // Search helpers
  searchMovies,
  searchTv,
  getContent,
  getStreamingEmbeds,
  sortContent,
  listContentSorted,
  attachImages,
  attachViews,
  getPostViews,
  getCategories,
  getCategory,
  getCountries,
  getCountry,
  extractImage,
  fetchImagesBatch,
  // Detail helpers
  getMovieDetail,
  getTvDetail,
  getRelatedMovies,
  // RebahinQuery
}

/*
Panduan pemakaian (step-by-step):
1. Import yang dibutuhkan
   import {
     listMovies,
     listTv,
     listContentSorted,
     listContentByViews,
     listNewReleases,
     searchMovies,
     searchTv,
     listMoviesWithImages,
     listTvWithImages,
     getContent,
     getStreamingEmbeds,
     getMovieDetail,
     getTvDetail,
     getRelatedMovies,
     extractImage,
     fetchImagesBatch,
     attachImages,
     attachViews,
     getPostViews,
     RebahinQuery,
     RebahinImage,
     RebahinContentWithImage,
     RebahinContentWithViews,
     RebahinMovieDetail,
     RebahinTaxonomyItem,
     RelatedQuery,
   } from "./rebahinHelper"

2. Listing konten dasar (dengan image URL otomatis)
   // film terpopuler 10 terbaru - sudah include image_url
   const latestMovies = await listMoviesWithImages({ order: "desc", orderBy: "date", perPage: 10 })
   latestMovies.forEach(movie => {
     console.log(movie.image_url) // URL gambar langsung tersedia
     console.log(movie.image_thumb) // Thumbnail URL
     console.log(movie.image_medium) // Medium size URL
   })

   // film dengan sorting "new" - sudah include image_url
   const newMovies = await listContentSorted("movie", "new", { perPage: 10 })
   newMovies.forEach(movie => console.log(movie.image_url))

   // film dengan sorting "hot" - sudah include image_url
   const hotMovies = await listContentSorted("movie", "hot", { perPage: 10 })

   // film dengan sorting "recommendations" - sudah include image_url
   const recommendedMovies = await listContentSorted("movie", "recommendations", { perPage: 10 })
   
   // List tanpa image (raw data)
   const rawMovies = await listMovies({ perPage: 10 })

   // TV show dengan kata kunci "one piece"
   const tvSearch = await listTv({ search: "one piece", perPage: 5 })

11. Search Movies/TV
    // Search movies dengan keyword
    const searchResults = await searchMovies("action", { perPage: 10 })
    searchResults.forEach(movie => {
      console.log(movie.title.rendered, movie.image_url)
    })
    
    // Search TV shows
    const tvResults = await searchTv("drama", { perPage: 10 })

3. Filtering dengan taxonomy (ID bisa didapat dari endpoint WP terkait)
   const filter: RebahinQuery = {
     muviyear: 2024,           // tahun rilis
     muvicountry: [1117, 1118] // negara
   }
   const filteredMovies = await listMovies(filter)

4. Ambil detail 1 konten
   const detail = await getContent("movie", latestMovies[0].slug) // slug atau id

5. Ambil embed streaming siap pakai
   const { content, embeds } = await getStreamingEmbeds("movie", detail?.slug ?? "")
   // prioritas: iframe di JSON -> scrape halaman publik
   const embedUrl = embeds[0]?.src // pakai ini untuk player

6. Abort & custom fetch (misal lewat proxy)
   const controller = new AbortController()
   const res = await listMovies(
     { search: "action" },
     { fetchImpl: fetch, signal: controller.signal },
   )

Catatan:
- Query bawaan WP: search, page, perPage, order, orderBy.
- OrderBy bawaan WP: date, modified, title, id, slug, relevance, include_slugs.
- OrderBy custom (rating, hot, recommendations) tidak didukung langsung oleh API,
  gunakan listContentSorted() atau sortContent() untuk sorting client-side.
- Taxonomy di Rebahin: muvidirector, muvicast, muviyear, muvicountry, muviquality, muviindex, muvinetwork (bisa array atau single).
- getStreamingEmbeds akan mengembalikan [] jika tidak ada iframe yang ditemukan.

Sorting Custom (rating, hot, recommendations, new, VIEWS):
  // Menggunakan helper listContentSorted untuk sorting client-side
  const hotMovies = await listContentSorted("movie", "hot", { perPage: 10 })
  const newMovies = await listContentSorted("movie", "new", { perPage: 10 })
  const recommended = await listContentSorted("movie", "recommendations", { perPage: 10 })
  const byRating = await listContentSorted("movie", "rating", { perPage: 10 })
  
  // Atau sort manual setelah fetch
  const movies = await listMovies({ perPage: 50 })
  const sorted = sortContent(movies, "hot", "desc")

9. Sort by VIEWS (Most Viewed)
   // Cara 1: Gunakan listContentByViews (otomatis fetch views + sort)
   const mostViewed = await listContentByViews("movie", { perPage: 10 })
   mostViewed.forEach(movie => {
     console.log(movie.title.rendered, movie.views) // views: number
   })
   
   // Cara 2: Manual fetch views dan sort
   const movies = await listMoviesWithImages({ perPage: 50 })
   const withViews = await attachViews(movies)
   const sorted = withViews.sort((a, b) => b.views - a.views)
   
   // Cara 3: Get views only
   const viewsMap = await getPostViews([20233, 20234, 20235])
   console.log(viewsMap.get(20233)) // 1500

10. Get New Releases (Film Tahun Ini)
    // Get film yang rilis tahun ini (2026), sudah sorted by date terbaru
    const newReleases = await listNewReleases({ perPage: 10 })
    newReleases.forEach(movie => {
      console.log(movie.title.rendered, movie.image_url)
    })
    
    // Dengan filter tambahan (genre, country, etc)
    const actionNewReleases = await listNewReleases({ 
      perPage: 10,
      categories: [1123] // Action genre
    })

7. Get Categories (Genres) dan Countries
   // Get all categories
   const categories = await getCategories({ perPage: 100 })
   
   // Get single category
   const actionCategory = await getCategory(1123)
   
   // Get all countries
   const countries = await getCountries({ perPage: 100, orderBy: "name" })
   
   // Get single country
   const indonesia = await getCountry(1158)

8. Get Image/Poster Film
   // Cara 1: Gunakan embed=true saat fetch list (paling efisien)
   const movies = await listMovies({ perPage: 10, embed: true })
   movies.forEach(movie => {
     const image = extractImage(movie, "medium") // "full" | "medium" | "thumbnail" | "source"
     console.log(image?.url)
   })
   
   // Cara 2: Extract dari yoast_head_json (tidak perlu embed)
   const movies2 = await listMovies({ perPage: 10 })
   movies2.forEach(movie => {
     const image = extractImage(movie) // otomatis ambil dari yoast
     console.log(image?.url)
   })
   
   // Cara 3: Batch fetch images (jika perlu size tertentu dan belum ada)
   const imageMap = await fetchImagesBatch(movies2, "medium")
   movies2.forEach(movie => {
     const image = imageMap.get(movie.id)
     console.log(image?.url)
   })

10. Get Movie/TV Detail Lengkap
    // Get detail movie dengan semua metadata, embeds, dan related movies
    const detail = await getMovieDetail("movie-slug", {
      includeRelated: true, // Sertakan related movies
      relatedQuery: {
        perPage: 6,
        sameGenre: true, // Related dengan genre yang sama
        sameYear: false,
      }
    })
    
    if (detail) {
      console.log(detail.title)           // Judul
      console.log(detail.image_url)       // Poster
      console.log(detail.views)           // View count
      console.log(detail.year)            // Array { id, name, slug }
      console.log(detail.genre)           // Array { id, name, slug }
      console.log(detail.director)        // Array { id, name, slug }
      console.log(detail.cast)            // Array { id, name, slug }
      console.log(detail.country)         // Array { id, name, slug }
      console.log(detail.quality)         // Array { id, name, slug }
      console.log(detail.embeds)          // Array { src, iframe, source }
      console.log(detail.related)         // Array related movies dengan image
    }
    
    // Get detail TV show
    const tvDetail = await getTvDetail("tv-slug", { includeRelated: true })
    
    // Get related movies saja (tanpa detail utama)
    const movie = await getContent("movie", "slug")
    if (movie) {
      const related = await getRelatedMovies(movie, {
        perPage: 6,
        sameGenre: true,
        exclude: [movie.id]
      })
    }
*/
