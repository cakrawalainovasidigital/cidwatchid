import { createDecipheriv, pbkdf2Sync } from "crypto";

export const baseApiUrl = "https://plus.komiku.org/api/mobile/v1.0/";
export const aseIndexUrl = "https://index.komikid.org/";
export const baseContentUrl = "https://content.komikid.org/";
export const baseImageUrl = "https://plus.komiku.org/assets/media/images/";

export type KomikkuChapter = {
  id: number | string
  number: string | number
}

export type ApiEndpoint =
  | "auth/third-party/register"
  | "auth/third-party/sign-in"
  | "auth/sign-out"
  | "account/details"
  | "account/update"
  | "config/init"
  | "config/main"
  | "feed/posts/discover"
  | "feed/posts/followed"
  | "user/details"
  | "user/bookmarks"
  | "user/comments"
  | "user/followers"
  | "user/following"
  | "user/visitors"
  | "follow/add"
  | "follow/delete"
  | "bookmark/list"
  | "bookmark/add"
  | "bookmark/update"
  | "bookmark/delete"
  | "comment/list"
  | "comment/add"
  | "comment/update"
  | "comment/delete"
  | "reply/list"
  | "reply/add"
  | "reply/update"
  | "reply/delete"
  | "react/chapter/list"
  | "react/chapter/add"
  | "react/chapter/delete"
  | "react/comment/list"
  | "react/comment/add"
  | "react/comment/delete"
  | "react/reply/list"
  | "react/reply/add"
  | "react/reply/delete"
  | "preview/series"
  | "preview/chapter"
  | "sticker/all"
  | "report/list"
  | "report/details"
  | "report/add"
  | "product/list"
  | "purchase/list"
  | "purchase/details"
  | "trial-subscription/apply";

export type QueryParams = Record<string, string | number | undefined>;

export interface HeaderContext {
  userAgent: string;
  countryCode?: string;
  secureSeeds?: string;
  fcmToken?: string;
  memberCode?: string;
  mobileToken?: string;
  packageName?: string;
  versionCode?: string;
}

export function buildDefaultHeaders(ctx: HeaderContext): HeadersInit {
  const {
    userAgent,
    countryCode = "ID",
    secureSeeds = "",
    fcmToken = "",
    memberCode = "",
    mobileToken = "",
    packageName = "id.komiku.plus",
    versionCode = "7",
  } = ctx;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": userAgent,
    "x-secure-seeds": secureSeeds,
    "x-package-name": packageName,
    "x-version-code": versionCode,
    "x-country-code": countryCode,
    "x-fcm-token": fcmToken,
  };

  if (memberCode) {
    headers["x-member-code"] = memberCode;
  }
  if (mobileToken) {
    headers["x-mobile-token"] = mobileToken;
  }

  return headers;
}

function applyQueryParams(url: URL, query?: QueryParams) {
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url;
}

export function apiUrl(path: ApiEndpoint, query?: QueryParams): string {
  return applyQueryParams(new URL(path, baseApiUrl), query).toString();
}

async function requestJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit
): Promise<T> {
  const res = await fetchImpl(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = `HTTP ${res.status} ${res.statusText} ${text}`.trim();
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export interface KomikkuClientConfig extends HeaderContext {
  fetchImpl?: typeof fetch;
}

export type KomikkuClientOptions = Partial<KomikkuClientConfig>;

export type ApiClientConfig = KomikkuClientOptions;
export type ContentClientConfig = KomikkuClientOptions;

const DEFAULT_CLIENT_CONFIG: KomikkuClientConfig = {
  userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile",
};

function resolveConfig(config?: KomikkuClientOptions): KomikkuClientConfig {
  return { ...DEFAULT_CLIENT_CONFIG, ...config };
}

export interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
}

export function createApiClient(config: ApiClientConfig = DEFAULT_CLIENT_CONFIG) {
  const resolvedConfig = resolveConfig(config);
  const fetchImpl = resolvedConfig.fetchImpl ?? fetch;
  const headers = buildDefaultHeaders(resolvedConfig);

  const request = async <T = unknown>(
    path: ApiEndpoint,
    method: "GET" | "POST",
    options: RequestOptions = {}
  ): Promise<T> => {
    const url = apiUrl(path, options.query);
    const init: RequestInit = {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    };
    return requestJson<T>(fetchImpl, url, init);
  };

  return {
    headers,
    url: (path: ApiEndpoint, query?: QueryParams) => apiUrl(path, query),
    get: <T = unknown>(path: ApiEndpoint, query?: RequestOptions["query"]) =>
      request<T>(path, "GET", { query }),
    post: <T = unknown>(path: ApiEndpoint, body?: RequestOptions["body"]) =>
      request<T>(path, "POST", { body }),
  };
}

export type ContentEndpointSpec =
  | { kind: "homepage" }
  | { kind: "manga"; id: string | number }
  | { kind: "chapter"; id: string | number }
  | { kind: "genres"; genre?: string; page?: number }
  | { kind: "mangalist" }
  | { kind: "search"; query: string; page?: number }
  | {
      kind: "news";
      page?: number;
      filters?: Record<string, string | number | undefined>;
    }
  | { kind: "favorites"; ids: Array<string | number> };

const CONTENT_PASSWORD = "org.komiku.qyGjx5V46Tkhh7Bs";
const CONTENT_SALT = "179";
const CONTENT_ITERATIONS = 65536;
const CONTENT_KEY_LENGTH = 32; // 256-bit
const CONTENT_IV = Buffer.from([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
]);

function deriveContentKey(): Buffer {
  return pbkdf2Sync(
    CONTENT_PASSWORD,
    CONTENT_SALT,
    CONTENT_ITERATIONS,
    CONTENT_KEY_LENGTH,
    "sha1"
  );
}


export function decryptContentCiphertext(encrypted: string): string {
  if (!encrypted) return "";
  const key = deriveContentKey();
  const decipher = createDecipheriv("aes-256-cbc", key, CONTENT_IV);
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function decryptChapterJson<T = unknown>(encrypted: string): any {
  const plaintext = decryptContentCiphertext(encrypted);
  return JSON.parse(plaintext) as any;
}

export function decryptImageField(encrypted: string): any {
  return decryptContentCiphertext(encrypted);
}

export function buildContentUrl(spec: ContentEndpointSpec): string {
  switch (spec.kind) {
    case "homepage": {
      return new URL("?content=homepage", aseIndexUrl).toString();
    }
    case "manga": {
      const u = new URL(baseContentUrl);
      u.searchParams.set("content", "manga");
      u.searchParams.set("id", String(spec.id));
      return u.toString();
    }
    case "chapter": {
      const u = new URL(baseContentUrl);
      u.searchParams.set("content", "chapter");
      u.searchParams.set("id", String(spec.id));
      return u.toString();
    }
    case "genres": {
      const path = spec.page ? `manga/page/${spec.page}/` : "manga/";
      const u = new URL(path, aseIndexUrl);
      if (spec.genre) {
        u.searchParams.set("genre", spec.genre);
      }
      return u.toString();
    }
    case "mangalist": {
      const u = new URL(baseContentUrl);
      u.searchParams.set("content", "mangalist");
      return u.toString();
    }
    case "search": {
      const path = spec.page ? `page/${spec.page}/` : "";
      const u = new URL(path, aseIndexUrl);
      u.searchParams.set("s", spec.query);
      return u.toString();
    }
    case "news": {
      const path = spec.page ? `manga/page/${spec.page}/` : "manga/";
      const u = new URL(path, aseIndexUrl);
      if (spec.filters) {
        Object.entries(spec.filters).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            u.searchParams.set(k, String(v));
          }
        });
      }
      return u.toString();
    }
    case "favorites": {
      const u = new URL("manga/", aseIndexUrl);
      u.searchParams.set(
        "id",
        spec.ids.map((x) => String(x)).join(",")
      );
      return u.toString();
    }
    default:
      throw new Error("Unknown content endpoint");
  }
}

export interface ContentResponse {
  url: string;
  status: number;
  ok: boolean;
  body: unknown;
}

export async function fetchContent(
  spec: ContentEndpointSpec,
  ctx: ContentClientConfig = DEFAULT_CLIENT_CONFIG
): Promise<ContentResponse> {
  const resolvedCtx = resolveConfig(ctx);
  const fetchImpl = resolvedCtx.fetchImpl ?? fetch;
  const headers = buildDefaultHeaders(resolvedCtx);
  const url = buildContentUrl(spec);
  const res = await fetchImpl(url, { method: "GET", headers });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep body as raw text when JSON parsing fails
  }
  return { url, status: res.status, ok: res.ok, body };
}

export function createContentClient(
  ctx: ContentClientConfig = DEFAULT_CLIENT_CONFIG
) {
  const resolvedCtx = resolveConfig(ctx);
  const fetchImpl = resolvedCtx.fetchImpl ?? fetch;
  const headers = buildDefaultHeaders(resolvedCtx);
  return {
    headers,
    url: (spec: ContentEndpointSpec) => buildContentUrl(spec),
    get: (spec: ContentEndpointSpec) =>
      fetchContent(spec, { ...resolvedCtx, fetchImpl }),
  };
}

const decryptHelpers = {
  ciphertext: decryptContentCiphertext,
  chapterJson: decryptChapterJson,
  image: decryptImageField,
};

export function createKomikkuClient(
  config: KomikkuClientConfig = DEFAULT_CLIENT_CONFIG
) {
  const resolvedConfig = resolveConfig(config);
  const api = createApiClient(resolvedConfig);
  const content = createContentClient(resolvedConfig);

  return {
    headers: api.headers,
    api: {
      url: api.url,
      get: api.get,
      post: api.post,
    },
    content: {
      url: content.url,
      get: content.get,
    },
    decrypt: decryptHelpers,
  };
}

export const Komikku = {
  baseUrl: {
    api: baseApiUrl,
    index: aseIndexUrl,
    content: baseContentUrl,
    image: baseImageUrl,
  },
  buildHeaders: buildDefaultHeaders,
  apiUrl,
  contentUrl: buildContentUrl,
  createClient: createKomikkuClient,
  createApiClient,
  createContentClient,
  fetchContent,
  decrypt: decryptHelpers,
};
