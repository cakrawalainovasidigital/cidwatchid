import type { Context } from "hono";

type AppEnv = {
  Bindings: Env;
};

export type BaseUrlVersion = "v1" | "v2" | "v3" | "v4";

/**
 * Get base URL based on version
 */
function getBaseUrl(c: Context<AppEnv>, version: BaseUrlVersion): string {
  switch (version) {
    case "v1":
      return c.env.BASE_URL_V1;
    case "v2":
      return c.env.BASE_URL_V2;
    case "v3":
      return c.env.BASE_URL_V3;
    case "v4":
      return c.env.BASE_URL_V4;
    default:
      return c.env.BASE_URL_V1;
  }
}

/**
 * Simple fetcher object with only GET method
 * Usage: fetcher.get(c, 'v1', '/path')
 */
export const fetcher = {
  /**
   * GET request with version parameter
   * @param c - Hono context
   * @param version - Base URL version (v1, v2, v3)
   * @param path - API path
   * @param headers - Optional headers
   */
  async get<T = unknown>(
    c: Context<AppEnv>,
    version: BaseUrlVersion,
    path: string,
    headers?: Record<string, string>
  ): Promise<T> {
    const baseUrl = path.startsWith("http") ? "" : getBaseUrl(c, version);
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  },

  /**
   * POST request with version parameter
   * @param c - Hono context
   * @param version - Base URL version (v1, v2, v3, v4)
   * @param path - API path
   * @param body - Request body
   * @param headers - Optional headers
   */
  async post<T = unknown>(
    c: Context<AppEnv>,
    version: BaseUrlVersion,
    path: string,
    body: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const baseUrl = path.startsWith("http") ? "" : getBaseUrl(c, version);
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      };
    }

    return response.json() as Promise<T>;
  },
};
