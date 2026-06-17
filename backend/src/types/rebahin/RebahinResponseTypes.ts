
export interface RebahinMovie {
  id: number
  slug: string
  title: {
    rendered: string
  }
  content?: {
    rendered: string
  }
  excerpt?: {
    rendered: string
  }
  date: string
  modified: string
  type: 'movie'
  link: string
  status?: string
  author?: number
  featured_media?: number
  comment_status?: string
  ping_status?: string
  template?: string
  format?: string
  meta?: Record<string, unknown>
  categories?: number[]
  tags?: number[]
  muviyear?: number[]
  muvicountry?: number[]
  muviquality?: number[]
  muvidirector?: number[]
  muvicast?: number[]
  muvinetwork?: number[]
  muviduration?: number[]
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      id: number
      source_url: string
      media_details?: {
        sizes?: {
          thumbnail?: { source_url: string }
          medium?: { source_url: string }
          full?: { source_url: string }
        }
      }
    }>
  }
  yoast_head_json?: {
    og_image?: Array<{ url: string }>
    thumbnailUrl?: string
  }
  views?: number
}

/** Movie with extracted image URL */
export interface RebahinMovieWithImage extends RebahinMovie {
  image_url: string | null
  image_thumb: string | null
  image_medium: string | null
}

/** Movie with view count */
export interface RebahinMovieWithViews extends RebahinMovieWithImage {
  views: number
}

// ============================================================================
// TAXONOMY TYPES
// ============================================================================

/** Base taxonomy item */
export interface RebahinTaxonomy {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string
  taxonomy: string
  parent?: number
  meta?: Record<string, unknown>
}

/** Category/Genre */
export interface RebahinCategory extends RebahinTaxonomy {
  taxonomy: 'category'
}

/** Country */
export interface RebahinCountry extends RebahinTaxonomy {
  taxonomy: 'muvicountry'
}

/** Network */
export interface RebahinNetwork extends RebahinTaxonomy {
  taxonomy: 'muvinetwork'
}

/** Cast/Actor */
export interface RebahinCast extends RebahinTaxonomy {
  taxonomy: 'muvicast'
}

/** Director */
export interface RebahinDirector extends RebahinTaxonomy {
  taxonomy: 'muvidirector'
}

/** Quality (HD, Bluray, etc) */
export interface RebahinQuality extends RebahinTaxonomy {
  taxonomy: 'muviquality'
}

/** Year */
export interface RebahinYear extends RebahinTaxonomy {
  taxonomy: 'muviyear'
}

/** Duration */
export interface RebahinDuration extends RebahinTaxonomy {
  taxonomy: 'muviduration'
}

// ============================================================================
// DETAIL TYPES
// ============================================================================

/** Streaming embed source */
export interface RebahinEmbed {
  embeds: any
  src: string
  source: string
  title?: string
}

/** Full movie detail with all metadata */
export interface RebahinMovieDetail {
  id: number
  slug: string
  title: string
  content: string
  excerpt: string
  date: string
  modified: string
  type: 'movie'
  link: string
  image_url: string | null
  image_thumb: string | null
  image_medium: string | null
  views: number
  year: RebahinYear[]
  country: RebahinCountry[]
  quality: RebahinQuality[]
  director: RebahinDirector[]
  cast: RebahinCast[]
  genre: RebahinCategory[]
  network: RebahinNetwork[]
  duration: RebahinDuration[]
  embeds: RebahinEmbed[]
  related: RebahinMovieWithImage[]
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/** Success response wrapper */
export interface ApiSuccessResponse<T> {
  id: any
  title: any
  content: any
  image_thumb: any
  image_medium: any
  country: any
  cast: any
  embeds: any
  genre: any
  duration: any
  success: true
  data: T
  meta?: {
    count?: number
    page?: number
    perPage?: number
    query?: string
    [key: string]: unknown
  }
}

/** Error response */
export interface ApiErrorResponse {
  success: false
  message: string
  error?: string
  path?: string
}

/** Generic API response */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ============================================================================
// ENDPOINT SPECIFIC RESPONSES
// ============================================================================

// Movies
export type ListMoviesResponse = ApiSuccessResponse<RebahinMovieWithImage[]>
export type MovieDetailResponse = ApiSuccessResponse<RebahinMovieDetail>
export type MovieStreamResponse = ApiSuccessResponse<{
  content: {
    id: number
    title: string
    slug: string
  }
  embeds: RebahinEmbed[]
}>

// Taxonomy Lists
export type ListCategoriesResponse = ApiSuccessResponse<RebahinCategory[]>
export type ListCountriesResponse = ApiSuccessResponse<RebahinCountry[]>
export type ListNetworksResponse = ApiSuccessResponse<RebahinNetwork[]>
export type ListCastsResponse = ApiSuccessResponse<RebahinCast[]>
export type ListDirectorsResponse = ApiSuccessResponse<RebahinDirector[]>
export type ListQualitiesResponse = ApiSuccessResponse<RebahinQuality[]>

// Taxonomy Details
export type CategoryDetailResponse = ApiSuccessResponse<RebahinCategory>
export type CountryDetailResponse = ApiSuccessResponse<RebahinCountry>
export type NetworkDetailResponse = ApiSuccessResponse<RebahinNetwork>
export type CastDetailResponse = ApiSuccessResponse<RebahinCast>
export type DirectorDetailResponse = ApiSuccessResponse<RebahinDirector>
export type QualityDetailResponse = ApiSuccessResponse<RebahinQuality>

// Movies by Taxonomy
export type MoviesByCategoryResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { categoryId: number; count: number }
}
export type MoviesByCountryResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { countryId: number; count: number }
}
export type MoviesByNetworkResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { networkId: number; count: number }
}
export type MoviesByCastResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { castId: number; count: number }
}
export type MoviesByDirectorResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { directorId: number; count: number }
}
export type MoviesByQualityResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { qualityId: number; count: number }
}
export type MoviesByYearResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { year: number; count: number }
}

// Search
export type SearchMoviesResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { query: string; count: number }
}
export type SearchAllResponse = ApiSuccessResponse<{
  movies: RebahinMovieWithImage[]
  total: number
}> & {
  meta: { query: string; count: number }
}

// Trending
export type TrendingMoviesResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { sort: string; count: number }
}
export type NewReleasesResponse = ApiSuccessResponse<RebahinMovieWithImage[]> & {
  meta: { year: number; count: number }
}

// Views
export type ViewsResponse = ApiSuccessResponse<{
  id: number
  views: number
}>
export type BatchViewsResponse = ApiSuccessResponse<Record<number, number>>

// ============================================================================
// QUERY PARAMETER TYPES
// ============================================================================

/** Query parameters for listing content */
export interface ListMoviesQuery {
  page?: number
  per_page?: number
  perPage?: number
  order?: 'asc' | 'desc'
  orderby?: 'date' | 'modified' | 'title' | 'id' | 'slug' | 'relevance'
  search?: string
  slug?: string
  categories?: string
  tags?: string
  year?: string
  muviyear?: string
  country?: string
  muvicountry?: string
  quality?: string
  muviquality?: string
  director?: string
  muvidirector?: string
  cast?: string
  muvicast?: string
  network?: string
  muvinetwork?: string
  exclude?: string
  embed?: 'true' | '1' | 'false' | '0'
  related?: 'true' | '1' | 'false' | '0'
}

/** Query parameters for search */
export interface SearchQuery extends ListMoviesQuery {
  q?: string
  keyword?: string
  query?: string
}

/** Query parameters for taxonomy */
export interface TaxonomyQuery {
  page?: number
  per_page?: number
  perPage?: number
  order?: 'asc' | 'desc'
  orderby?: 'name' | 'slug' | 'id' | 'count'
  hide_empty?: boolean
  search?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** API Info/Root endpoint response */
export interface ApiInfo {
  name: string
  version: string
  description: string
  queryParams: {
    pagination: string[]
    sorting: string[]
    filtering: string[]
    search: string[]
    other: string[]
  }
  endpoints: {
    health: string
    movies: Record<string, string>
    search: Record<string, string>
    categories: Record<string, string>
    countries: Record<string, string>
    networks: Record<string, string>
    casts: Record<string, string>
    directors: Record<string, string>
    qualities: Record<string, string>
    views: Record<string, string>
  }
}

/** Health check response */
export interface HealthResponse {
  status: 'ok'
  timestamp: string
}
