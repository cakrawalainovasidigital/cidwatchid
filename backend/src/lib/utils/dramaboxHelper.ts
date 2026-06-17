type RetryConfig = {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
};

type CacheTtlConfig = {
  token: number;
  dramaList: number;
  dramaDetail: number;
  chapters: number;
  categories: number;
  search: number;
};

type TimeoutConfig = {
  requestMs: number;
  tokenMs: number;
};

type RequestOptions = {
  isWebfic?: boolean;
  method?: string;
  allowFailure?: boolean;
};

export type Logger = {
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
};

export type CacheStore = {
  [x: string]: any;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlSeconds: number): void;
  del(key: string): void;
  clear(): void;
  stats?: () => Record<string, number>;
};

export type DramaboxHelperOptions = {
  lang?: string;
  baseUrl?: string;
  webficUrl?: string;
  retry?: Partial<RetryConfig>;
  cacheTtl?: Partial<CacheTtlConfig>;
  timeouts?: Partial<TimeoutConfig>;
  cache?: CacheStore | null;
  sharedToken?: boolean | true;
  signMode?: "auto" | "native" | "jwk";
  fetch?: (input: string, init?: Record<string, unknown>) => Promise<any>;
  logger?: Logger;
  now?: () => number;
  // Tuning for batch downloads
  batchDelayMs?: number;
  batchRetryDelayMs?: number;
  batchTokenResetDelayMs?: number;
};

export type TokenData = {
  token: string;
  deviceId: string;
  androidId: string;
  spoffer: string;
  uuid: string;
  attributionPubParam?: unknown;
  timestamp: number;
  expiry: number;
};

type HttpError = {
  status: number;
  statusText?: string;
  data?: unknown;
};

const defaultRetry: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

const defaultCacheTtl: CacheTtlConfig = {
  token: 3600,
  dramaList: 300,
  dramaDetail: 600,
  chapters: 600,
  categories: 1800,
  search: 180,
};

const defaultTimeOuts: TimeoutConfig = {
  requestMs: 30000,
  tokenMs: 15000,
};

const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const inflightRequests = new Map<string, Promise<unknown>>();

export const createMemoryCache = (): CacheStore => {
  const store = new Map<string, { value: unknown; expiresAt: number }>();

  return {
    get: <T>(key: string) => {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value as T;
    },
    set: <T>(key: string, value: T, ttlSeconds: number) => {
      const ttlMs = ttlSeconds > 0 ? ttlSeconds * 1000 : Number.POSITIVE_INFINITY;
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    del: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    stats: () => ({
      size: store.size,
    }),
  };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (attempt: number, retry: RetryConfig) => {
  const nextDelay =
    retry.initialDelayMs * Math.pow(retry.backoffMultiplier, attempt);
  return Math.min(nextDelay, retry.maxDelayMs);
};

const isHttpError = (error: unknown): error is HttpError =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  typeof (error as { status?: unknown }).status === "number";

const isRetryableError = (error: unknown) => {
  if (isHttpError(error)) {
    return RETRYABLE_STATUS_CODES.includes(error.status);
  }
  if (error instanceof Error) {
    return error.name === "AbortError" || error instanceof TypeError;
  }
  return false;
};

const formatError = (error: unknown, context = "") => {
  const prefix = context ? `[${context}] ` : "";

  if (isHttpError(error)) {
    const status = error.status;
    const statusText = error.statusText || "";
    switch (status) {
      case 400:
        return `${prefix}Bad Request - Parameter tidak valid`;
      case 401:
        return `${prefix}Unauthorized - Token tidak valid atau expired`;
      case 403:
        return `${prefix}Forbidden - Akses ditolak oleh server`;
      case 404:
        return `${prefix}Not Found - Data tidak ditemukan`;
      case 408:
        return `${prefix}Request Timeout - Server tidak merespons`;
      case 429:
        return `${prefix}Too Many Requests - Rate limit tercapai, coba lagi nanti`;
      case 500:
        return `${prefix}Internal Server Error - Server sedang bermasalah`;
      case 502:
        return `${prefix}Bad Gateway - Server upstream tidak merespons (coba lagi)`;
      case 503:
        return `${prefix}Service Unavailable - Server sedang maintenance`;
      case 504:
        return `${prefix}Gateway Timeout - Koneksi ke server timeout`;
      default:
        return `${prefix}HTTP ${status} ${statusText}`.trim();
    }
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return `${prefix}Request timeout - Koneksi terlalu lama`;
    }
    return `${prefix}${error.message}`;
  }

  return `${prefix}Unknown error`;
};

const getGlobal = () => globalThis as Record<string, unknown>;

const base64ToBytes = (base64: string) => {
  const globalObj = getGlobal();
  const atobFn = globalObj.atob as ((data: string) => string) | undefined;
  if (atobFn) {
    const binary = atobFn(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const BufferCtor = globalObj.Buffer as
    | { from: (data: string, encoding: string) => Uint8Array }
    | undefined;
  if (BufferCtor) {
    return new Uint8Array(BufferCtor.from(base64, "base64"));
  }

  throw new Error("Base64 decode is not available in this runtime");
};

const bytesToBase64 = (bytes: Uint8Array) => {
  const globalObj = getGlobal();
  const btoaFn = globalObj.btoa as ((data: string) => string) | undefined;
  if (btoaFn) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoaFn(binary);
  }

  const BufferCtor = globalObj.Buffer as
    | { from: (data: Uint8Array) => { toString: (encoding: string) => string } }
    | undefined;
  if (BufferCtor) {
    return BufferCtor.from(bytes).toString("base64");
  }

  throw new Error("Base64 encode is not available in this runtime");
};

const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

const pemToArrayBuffer = (pem: string) => {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const bytes = base64ToBytes(base64);
  return bytesToArrayBuffer(bytes);
};

type SubtleCryptoLike = {
  [x: string]: any;
  importKey: (
    format: string,
    keyData: ArrayBuffer | Record<string, unknown>,
    algorithm: Record<string, unknown>,
    extractable: boolean,
    keyUsages: string[]
  ) => Promise<unknown>;
  sign: (
    algorithm: string | Record<string, unknown>,
    key: unknown,
    data: ArrayBuffer | Uint8Array
  ) => Promise<ArrayBuffer>;
};

type CryptoApiLike = {
  subtle: SubtleCryptoLike;
  getRandomValues: (array: Uint8Array) => Uint8Array;
  randomUUID?: () => string;
};

type KeyMaterial = {
  key: unknown | null;
  jwk: {
    kty: string;
    n: string;
    e: string;
    d: string;
    p: string;
    q: string;
    dp: string;
    dq: string;
    qi: string;
  } | null;
};

type SharedTokenEntry = {
  token: TokenData | null;
  promise: Promise<TokenData> | null;
};

const base64UrlEncode = (bytes: Uint8Array) =>
  bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlToBytes = (base64Url: string) => {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);
  return base64ToBytes(padded);
};

const bytesToBigInt = (bytes: Uint8Array) => {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
};

const bigIntToBytes = (value: bigint, length: number) => {
  const result = new Uint8Array(length);
  let temp = value;
  for (let i = length - 1; i >= 0; i -= 1) {
    result[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
  return result;
};

const modPow = (base: bigint, exponent: bigint, modulus: bigint) => {
  let result = 1n;
  let b = base % modulus;
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) {
      result = (result * b) % modulus;
    }
    e >>= 1n;
    b = (b * b) % modulus;
  }
  return result;
};

const getSharedTokenStore = () => {
  const globalObj = getGlobal() as Record<string, unknown>;
  const existing = globalObj.__dramaboxTokenStore as
    | Map<string, SharedTokenEntry>
    | undefined;
  if (existing) return existing;
  const store = new Map<string, SharedTokenEntry>();
  globalObj.__dramaboxTokenStore = store;
  return store;
};

const stripLeadingZero = (bytes: Uint8Array) => {
  let offset = 0;
  while (offset < bytes.length - 1 && bytes[offset] === 0) {
    offset += 1;
  }
  return bytes.slice(offset);
};

const readAsn1Length = (bytes: Uint8Array, offset: number) => {
  const first = bytes[offset];
  if (first === undefined) {
    throw new Error("ASN.1 length out of range");
  }
  if (first < 0x80) {
    return { length: first, bytesRead: 1 };
  }
  const count = first & 0x7f;
  let length = 0;
  for (let i = 0; i < count; i += 1) {
    length = (length << 8) | bytes[offset + 1 + i];
  }
  return { length, bytesRead: 1 + count };
};

const readAsn1Element = (bytes: Uint8Array, offset: number) => {
  const tag = bytes[offset];
  if (tag === undefined) {
    throw new Error("ASN.1 tag out of range");
  }
  const { length, bytesRead } = readAsn1Length(bytes, offset + 1);
  const headerLength = 1 + bytesRead;
  const start = offset + headerLength;
  const end = start + length;
  if (end > bytes.length) {
    throw new Error("ASN.1 length exceeds buffer");
  }
  return { tag, start, end, nextOffset: end };
};

const readAsn1Integer = (bytes: Uint8Array, offset: number) => {
  const element = readAsn1Element(bytes, offset);
  if (element.tag !== 0x02) {
    throw new Error("ASN.1 INTEGER expected");
  }
  const value = stripLeadingZero(bytes.slice(element.start, element.end));
  return { value, nextOffset: element.nextOffset };
};

const parsePkcs8ToJwk = (keyData: ArrayBuffer) => {
  const bytes = new Uint8Array(keyData);
  let offset = 0;

  const outer = readAsn1Element(bytes, offset);
  if (outer.tag !== 0x30) {
    throw new Error("PKCS8 sequence expected");
  }
  offset = outer.start;

  const version = readAsn1Integer(bytes, offset);
  offset = version.nextOffset;

  const algorithm = readAsn1Element(bytes, offset);
  if (algorithm.tag !== 0x30) {
    throw new Error("Algorithm sequence expected");
  }
  offset = algorithm.nextOffset;

  const privateKey = readAsn1Element(bytes, offset);
  if (privateKey.tag !== 0x04) {
    throw new Error("PrivateKey octet string expected");
  }

  const innerBytes = bytes.slice(privateKey.start, privateKey.end);
  let innerOffset = 0;
  const inner = readAsn1Element(innerBytes, innerOffset);
  if (inner.tag !== 0x30) {
    throw new Error("RSA key sequence expected");
  }
  innerOffset = inner.start;

  const innerVersion = readAsn1Integer(innerBytes, innerOffset);
  innerOffset = innerVersion.nextOffset;
  const modulus = readAsn1Integer(innerBytes, innerOffset);
  innerOffset = modulus.nextOffset;
  const publicExponent = readAsn1Integer(innerBytes, innerOffset);
  innerOffset = publicExponent.nextOffset;
  const privateExponent = readAsn1Integer(innerBytes, innerOffset);
  innerOffset = privateExponent.nextOffset;
  const prime1 = readAsn1Integer(innerBytes, innerOffset);
  innerOffset = prime1.nextOffset;
  const prime2 = readAsn1Integer(innerBytes, innerOffset);
  innerOffset = prime2.nextOffset;
  const exponent1 = readAsn1Integer(innerBytes, innerOffset);
  innerOffset = exponent1.nextOffset;
  const exponent2 = readAsn1Integer(innerBytes, innerOffset);
  innerOffset = exponent2.nextOffset;
  const coefficient = readAsn1Integer(innerBytes, innerOffset);
  innerOffset = coefficient.nextOffset;

  return {
    kty: "RSA",
    n: base64UrlEncode(modulus.value),
    e: base64UrlEncode(publicExponent.value),
    d: base64UrlEncode(privateExponent.value),
    p: base64UrlEncode(prime1.value),
    q: base64UrlEncode(prime2.value),
    dp: base64UrlEncode(exponent1.value),
    dq: base64UrlEncode(exponent2.value),
    qi: base64UrlEncode(coefficient.value),
  };
};

const createDramaboxUtil = (
  logger: Logger,
  signMode: "auto" | "native" | "jwk" = "auto"
) => {
  const globalObj = getGlobal();
  const cryptoApi = globalObj.crypto as CryptoApiLike | undefined;

  if (!cryptoApi?.subtle || !cryptoApi.getRandomValues) {
    throw new Error("Web Crypto is required for Dramabox helper");
  }
  const subtle = cryptoApi.subtle;
  const getRandomValues = cryptoApi.getRandomValues.bind(cryptoApi);
  const randomUUID = cryptoApi.randomUUID?.bind(cryptoApi);
  const navigatorValue = globalObj.navigator as { userAgent?: string } | undefined;
  const userAgent = typeof navigatorValue?.userAgent === "string" ? navigatorValue.userAgent : "";
  const isWorkerdRuntime =
    typeof (globalObj as { WebSocketPair?: unknown }).WebSocketPair !== "undefined" ||
    userAgent.includes("Cloudflare-Workers");
  const resolvedSignMode = signMode || "auto";
  const preferNativeSign =
    resolvedSignMode === "native"
      ? true
      : resolvedSignMode === "jwk"
        ? false
        : !isWorkerdRuntime;

  const decodeString = (str = "") => {
    let result = "";
    for (let i = 0; i < str.length; i += 1) {
      let c = str.charCodeAt(i);
      if (c >= 33 && c <= 126) {
        c -= 20;
        if (c < 33) c += 126 - 33;
      }
      result += String.fromCharCode(c);
    }
    return result;
  };

  const getPrivateKeyPem = () => {
    const part1 =
      "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Q4Y5QX5j08HrnbY3irfKdkEllAU2OORnAjlXDyCzcm2Z6ZRrGvtTZUAMelfU5PWS6XGEm3d4kJEKbXi4Crl8o2E/E3YJPk1lQD1d0JTdrvZleETN1ViHZFSQwS3L94Woh0E3TPebaEYq88eExvKu1tDdjSoFjBbgMezySnas5Nc2xF28";
    const part2 = decodeString(
      `l|d,WL$EI,?xyw+*)^#?U\`[whXlG\`-GZif,.jCxbKkaY"{w*y]_jax^/1iVDdyg(Wbz+z/$xVjCiH0lZf/d|%gZglW)"~J,^~}w"}m(E'eEunz)eyEy\`XGaVF|_(Kw)|awUG"'{{e#%$0E.ffHVU++$giHzdvC0ZLXG|U{aVUUYW{{YVU^x),J'If\`nG|C[\`ZF),xLv(-H'}ZIEyCfke0dZ%aU[V)"V0}mhKvZ]Gw%-^a|m'\`\\f}{(~kzi&zjG+|fXX0$IH#j\`+hfnME"|fa/{.j.xf,"LZ.K^bZy%c.W^/v{x#(J},Ua,ew#.##K(ki)$LX{a-1\\MG/zL&JlEKEw'Hg|D&{EfuKYM[nGKx1V#lFu^V_LjVzw+n%+,Xd`
    );
    const part3 =
      "x52e71nafqfbjXxZuEtpu92oJd6A9mWbd0BZTk72ZHUmDcKcqjfcEH19SWOphMJFYkxU5FRoIEr3/zisyTO4Mt33ZmwELOrY9PdlyAAyed7ZoH+hlTr7c025QROvb2LmqgRiUT56tMECgYEA+jH5m6iMRK6XjiBhSUnlr3DzRybwlQrtIj5sZprWe2my5uYHG3jbViYIO7GtQvMTnDrBCxNhuM6dPrL0cRnbsp/iBMXe3pyjT/aWveBkn4R+UpBsnbtDn28r1MZpCDtr5UNc0TPj4KFJvjnV/e8oGoyYEroECqcw1LqNOGDiLhkCgYEAwaemNePYrXW+MVX/hatfLQ96tpxwf7yuHdENZ2q5AFw73GJWYvC8VY+TcoKPAmeoCUMltI3TrS6K5Q/GoLd5K2BsoJrSxQNQFd3ehWAtdOuPDvQ5rn/2fsvgvc3rOvJh7uNnwEZCI/45WQg+UFWref4PPc+ArNtp9Xj2y7LndwkCgYARojIQeXmhYZjG6JtSugWZLuHGkwUDzChYcIPd";
    const part4 =
      "W25ndluokG/RzNvQn4+W/XfTryQjr7RpXm1VxCIrCBvYWNU2KrSYV4XUtL+B5ERNj6In6AOrOAifuVITy5cQQQeoD+AT4YKKMBkQfO2gnZzqb8+ox130e+3K/mufoqJPZeyrCQKBgC2fobjwhQvYwYY+DIUharri+rYrBRYTDbJYnh/PNOaw1CmHwXJt5PEDcml3+NlIMn58I1X2U/hpDrAIl3MlxpZBkVYFI8LmlOeR7ereTddN59ZOE4jY/OnCfqA480Jf+FKfoMHby5lPO5OOLaAfjtae1FhrmpUe3EfIx9wVuhKBAoGBAPFzHKQZbGhkqmyPW2ctTEIWLdUHyO37fm8dj1WjN4wjRAI4ohNiKQJRh3QE11E1PzBTl9lZVWT8QtEsSjnrA/tpGr378fcUT7WGBgTmBRaAnv1P1n/Tp0TSvh5XpIhhMuxcitIgrhYMIG3GbP9JNAarxO/qPW6Gi0xWaF7il7Or";

    const fullPem = part1 + part2 + part3 + part4;
    return `-----BEGIN PRIVATE KEY-----\n${fullPem}\n-----END PRIVATE KEY-----`;
  };

  let keyMaterialPromise: Promise<KeyMaterial> | null = null;
  let allowNativeSign = preferNativeSign;
  let warnedNativeSignFailure = false;

  const getKeyMaterial = async () => {
    if (keyMaterialPromise) return keyMaterialPromise;
    keyMaterialPromise = (async () => {
      const keyData = pemToArrayBuffer(getPrivateKeyPem());
      let jwk: KeyMaterial["jwk"] = null;
      try {
        jwk = parsePkcs8ToJwk(keyData);
      } catch (err) {
        logger.warn?.("[DramaboxUtil] Failed to parse PKCS8 key:", err);
      }

      if (!allowNativeSign) {
        return { key: null, jwk };
      }

      try {
        const key = await subtle.importKey(
          "pkcs8",
          keyData,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["sign"]
        );
        return { key, jwk };
      } catch (err) {
        if (jwk) {
          try {
            logger.warn?.(
              "[DramaboxUtil] PKCS8 import failed, retrying with JWK"
            );
            const key = await subtle.importKey(
              "jwk",
              jwk,
              { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
              false,
              ["sign"]
            );
            return { key, jwk };
          } catch (jwkError) {
            logger.error?.("[DramaboxUtil] JWK import failed:", jwkError);
            return { key: null, jwk };
          }
        }

        logger.error?.("[DramaboxUtil] Failed to initialize private key:", err);
        return { key: null, jwk: null };
      }
    })();
    return keyMaterialPromise;
  };

  const signWithJwk = async (payloadBytes: Uint8Array, jwk: KeyMaterial["jwk"]) => {
    if (!jwk) return null;
    const digest = await subtle.digest("SHA-256", payloadBytes);
    const digestBytes = new Uint8Array(digest);
    const digestInfoPrefix = new Uint8Array([
      0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65,
      0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20,
    ]);
    const digestInfo = new Uint8Array(digestInfoPrefix.length + digestBytes.length);
    digestInfo.set(digestInfoPrefix, 0);
    digestInfo.set(digestBytes, digestInfoPrefix.length);

    const modulusBytes = base64UrlToBytes(jwk.n);
    const k = modulusBytes.length;
    if (digestInfo.length + 11 > k) {
      throw new Error("RSA key too short for SHA-256");
    }

    const psLength = k - digestInfo.length - 3;
    const em = new Uint8Array(k);
    em[0] = 0x00;
    em[1] = 0x01;
    em.fill(0xff, 2, 2 + psLength);
    em[2 + psLength] = 0x00;
    em.set(digestInfo, 3 + psLength);

    const n = bytesToBigInt(modulusBytes);
    const d = bytesToBigInt(base64UrlToBytes(jwk.d));
    const sigInt = modPow(bytesToBigInt(em), d, n);
    const sigBytes = bigIntToBytes(sigInt, k);
    return bytesToBase64(sigBytes);
  };

  const sign = async (payload: string) => {
    const { key, jwk } = await getKeyMaterial();
    try {
      const TextEncoderCtor = globalObj.TextEncoder as
        | { new(): { encode: (input?: string) => Uint8Array } }
        | undefined;
      if (!TextEncoderCtor) {
        throw new Error("TextEncoder is not available in this runtime");
      }
      const encoder = new TextEncoderCtor();
      const data = encoder.encode(payload);
      if (allowNativeSign && key) {
        try {
          const signature = await subtle.sign(
            "RSASSA-PKCS1-v1_5",
            key,
            data
          );
          return bytesToBase64(new Uint8Array(signature));
        } catch (err) {
          allowNativeSign = false;
          if (!warnedNativeSignFailure) {
            warnedNativeSignFailure = true;
            logger.warn?.(
              "[DramaboxUtil] Native sign failed, falling back to JWK"
            );
          }
        }
      }
      if (jwk) {
        return await signWithJwk(data, jwk);
      }
      return null;
    } catch (err) {
      logger.error?.("[DramaboxUtil] Sign error:", err);
      return null;
    }
  };

  const randomHex = (length: number) => {
    const bytes = new Uint8Array(length);
    getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  };

  const randomAndroidId = () => `ffffffff${randomHex(4)}000000000`;

  const generateRandomIP = () => {
    const bytes = new Uint8Array(4);
    getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString()).join(".");
  };

  const generateUUID = () => {
    if (randomUUID) {
      return randomUUID();
    }
    const bytes = new Uint8Array(16);
    getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };

  return {
    decodeString,
    sign,
    randomAndroidId,
    generateRandomIP,
    generateUUID,
  };
};

const fetchWithTimeout = async (
  fetchFn: (input: string, init?: Record<string, unknown>) => Promise<any>,
  url: string,
  init: Record<string, unknown>,
  timeoutMs: number
) => {
  const AbortControllerCtor = (getGlobal().AbortController as
    | { new(): { signal: unknown; abort: () => void } }
    | undefined);
  if (!AbortControllerCtor || !timeoutMs) {
    return fetchFn(url, init);
  }

  const controller = new AbortControllerCtor();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const safeJson = async (response: { json: () => Promise<unknown> }) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const createDramaboxHelper = (options: DramaboxHelperOptions = {}) => {
  const retry = { ...defaultRetry, ...options.retry };
  const cacheTtl = { ...defaultCacheTtl, ...options.cacheTtl };
  const timeouts = { ...defaultTimeOuts, ...options.timeouts };
  const lang = options.lang || "in";
  const baseUrl = options.baseUrl || "https://sapi.dramaboxdb.com";
  const webficUrl = options.webficUrl || "https://www.webfic.com";
  const logger = options.logger || console;
  const cache = options.cache ?? null;
  const now = options.now || (() => Date.now());
  const fetchFn = options.fetch || (getGlobal().fetch as DramaboxHelperOptions["fetch"]);
  const sharedTokenEnabled = options.sharedToken !== false;
  const sharedTokenStore = sharedTokenEnabled ? getSharedTokenStore() : null;
  const sharedTokenKey = `token_${lang}`;
  const batchDelayMs = options.batchDelayMs ?? 300;
  const batchRetryDelayMs = options.batchRetryDelayMs ?? 1000;
  const batchTokenResetDelayMs = options.batchTokenResetDelayMs ?? 700;

  if (!fetchFn) {
    throw new Error("fetch is not available in this runtime");
  }

  const util = createDramaboxUtil(logger, options.signMode ?? "auto");
  let tokenCache: TokenData | null = null;
  let tokenPromise: Promise<TokenData> | null = null;
  let warnedUnsigned = false;

  const warnUnsigned = (context: string) => {
    if (warnedUnsigned) return;
    warnedUnsigned = true;
    logger.warn?.(`[DramaboxUtil] Signature unavailable, sending ${context} without sn`);
  };

  const isTokenValid = (token: TokenData | null) =>
    Boolean(token && token.expiry > now() + 5 * 60 * 1000);

  const getSharedEntry = () => {
    if (!sharedTokenStore) return null;
    let entry = sharedTokenStore.get(sharedTokenKey);
    if (!entry) {
      entry = { token: null, promise: null };
      sharedTokenStore.set(sharedTokenKey, entry);
    }
    return entry;
  };

  const getCachedToken = () => {
    const sharedEntry = getSharedEntry();
    if (sharedEntry?.token && sharedEntry.token.expiry > now()) {
      tokenCache = sharedEntry.token;
      return sharedEntry.token;
    }
    if (!cache) return null;
    const cachedToken = cache.get<TokenData>(sharedTokenKey);
    if (cachedToken && cachedToken.expiry > now()) {
      tokenCache = cachedToken;
      return cachedToken;
    }
    return null;
  };

  const clearTokenState = () => {
    tokenCache = null;
    if (cache) {
      cache.del(sharedTokenKey);
    }
    const sharedEntry = getSharedEntry();
    if (sharedEntry) {
      sharedEntry.token = null;
      sharedEntry.promise = null;
    }
  };

  const buildBootstrapHeaders = (params: {
    deviceId: string;
    androidId: string;
    spoffer: string;
  }): Record<string, string> => ({
    tn: "",
    version: "470",
    vn: "4.7.0",
    cid: "DAUAF1064291",
    "package-Name": "com.storymatrix.drama",
    Apn: "1",
    "device-id": params.deviceId,
    language: lang,
    "current-Language": lang,
    p: "48",
    "Time-Zone": "+0700",
    md: "Redmi Note 8",
    ov: "9",
    "over-flow": "new-fly",
    "android-id": params.androidId,
    "X-Forwarded-For": params.spoffer,
    "X-Real-IP": params.spoffer,
    mf: "XIAOMI",
    brand: "Xiaomi",
    "Content-Type": "application/json; charset=UTF-8",
  });

  const buildRequestHeaders = (tokenData: TokenData): Record<string, string> => ({
    tn: `Bearer ${tokenData.token}`,
    // Align API headers with the latest bootstrap values to avoid server side
    // pagination caps (older app versions were being rate-limited to ~20 eps).
    // Token bootstrap already uses 4.7.0 / p=48 so we mirror that here.
    version: "470",
    vn: "4.7.0",
    cid: "DAUAF1064291",
    "package-Name": "com.storymatrix.drama",
    Apn: "1",
    "device-id": tokenData.deviceId,
    language: lang,
    "current-Language": lang,
    p: "48",
    "Time-Zone": "+0700",
    md: "Redmi Note 8",
    ov: "9",
    "over-flow": "new-fly",
    "android-id": tokenData.androidId,
    mf: "XIAOMI",
    brand: "Xiaomi",
    "X-Forwarded-For": tokenData.spoffer,
    "X-Real-IP": tokenData.spoffer,
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "okhttp/4.10.0",
  });

  const fetchJson = async (url: string, init: Record<string, unknown>, timeoutMs: number) => {
    const response = await fetchWithTimeout(fetchFn, url, init, timeoutMs);
    const data = await safeJson(response);
    if (!response.ok) {
      const error: HttpError = {
        status: response.status,
        statusText: response.statusText,
        data,
      };
      throw error;
    }
    return data;
  };

  const generateNewToken = async (
    timestamp = now(),
    attempt = 0
  ): Promise<TokenData> => {
    const cachedToken = getCachedToken();
    if (cachedToken) return cachedToken;

    try {
      logger.info?.(
        `[Token] Generating new token (attempt ${attempt + 1}/${retry.maxRetries + 1
        })...`
      );

      const spoffer = util.generateRandomIP();
      const deviceId = util.generateUUID();
      const androidId = util.randomAndroidId();

      const headers = buildBootstrapHeaders({ deviceId, androidId, spoffer });
      const body = JSON.stringify({ distinctId: null });
      const signature = await util.sign(
        `timestamp=${timestamp}${body}${deviceId}${androidId}`
      );
      if (signature) {
        headers.sn = signature;
      } else {
        warnUnsigned("token request");
      }

      const url = `${baseUrl}/drama-box/ap001/bootstrap?timestamp=${timestamp}`;
      const data = await fetchJson(
        url,
        {
          method: "POST",
          headers,
          body,
        },
        timeouts.tokenMs
      );

      const user = (data as { data?: { user?: { token: string; uid: string } } })
        ?.data?.user;
      if (!user) {
        throw new Error("Invalid token response - user data missing");
      }

      const creationTime = now();
      const tokenData: TokenData = {
        token: user.token,
        deviceId,
        androidId,
        spoffer,
        uuid: user.uid,
        attributionPubParam: (data as { data?: { attributionPubParam?: unknown } })
          ?.data?.attributionPubParam,
        timestamp: creationTime,
        expiry: creationTime + 24 * 60 * 60 * 1000,
      };

      tokenCache = tokenData;
      const sharedEntry = getSharedEntry();
      if (sharedEntry) {
        sharedEntry.token = tokenData;
      }
      if (cache) {
        cache.set(sharedTokenKey, tokenData, cacheTtl.token);
      }

      logger.info?.("[Token] Token generated successfully");
      return tokenData;
    } catch (error) {
      if (attempt < retry.maxRetries && isRetryableError(error)) {
        const retryDelay = getRetryDelay(attempt, retry);
        logger.warn?.(
          `[Token] ${formatError(error, "Token")} - Retrying in ${retryDelay}ms...`
        );
        await delay(retryDelay);
        return generateNewToken(now(), attempt + 1);
      }
      throw new Error(formatError(error, "Token generation"));
    }
  };

  const getToken = async () => {
    if (isTokenValid(tokenCache)) {
      return tokenCache as TokenData;
    }
    const cachedToken = getCachedToken();
    if (cachedToken && isTokenValid(cachedToken)) {
      return cachedToken;
    }

    const sharedEntry = getSharedEntry();
    if (sharedEntry?.promise) {
      return sharedEntry.promise;
    }

    if (!tokenPromise) {
      tokenPromise = generateNewToken();
      if (sharedEntry) {
        sharedEntry.promise = tokenPromise;
      }
    }
    try {
      return await tokenPromise;
    } finally {
      tokenPromise = null;
      if (sharedEntry) {
        sharedEntry.promise = null;
      }
    }
  };

  const requestWithRetry = async <T>(
    endpoint: string,
    payload: unknown = {},
    options: RequestOptions = {},
    attempt = 0,
    tokenRefreshed = false
  ): Promise<T> => {
    try {
      const timestamp = now();
      const method = (options.method || "POST").toUpperCase();
      const bodyPayload = payload ?? {};
      const body = JSON.stringify(bodyPayload);
      let url = "";
      let headers: Record<string, string> = {};

      if (options.isWebfic) {
        url = `${webficUrl}${endpoint}`;
        headers = {
          "Content-Type": "application/json",
          pline: "DRAMABOX",
          language: lang,
        };
      } else {
        const tokenData = await getToken();
        const joiner = endpoint.includes("?") ? "&" : "?";
        url = `${baseUrl}${endpoint}${joiner}timestamp=${timestamp}`;
        headers = buildRequestHeaders(tokenData);
        const signature = await util.sign(
          `timestamp=${timestamp}${body}${tokenData.deviceId}${tokenData.androidId}${headers.tn}`
        );
        if (signature) {
          headers.sn = signature;
        } else {
          warnUnsigned("API request");
        }
      }

      const responseData = await fetchJson(
        url,
        {
          method,
          headers,
          body: method !== "GET" ? body : undefined,
        },
        timeouts.requestMs
      );

      if (
        !options.isWebfic &&
        responseData &&
        (responseData as { success?: boolean }).success === false
      ) {
        if (!tokenRefreshed) {
          logger.warn?.("[Request] Token refresh needed, regenerating...");
          clearTokenState();
          await generateNewToken(now());
          return requestWithRetry<T>(
            endpoint,
            payload,
            options,
            attempt,
            true
          );
        }
        if (options.allowFailure) {
          return responseData as T;
        }
        throw new Error(
          (responseData as { message?: string }).message || "API request failed"
        );
      }

      return responseData as T;
    } catch (error) {
      if (attempt < retry.maxRetries && isRetryableError(error)) {
        const retryDelay = getRetryDelay(attempt, retry);
        logger.warn?.(
          `[Request] ${formatError(error)} - Retry ${attempt + 1}/${retry.maxRetries
          } in ${retryDelay}ms...`
        );
        if (isHttpError(error) && (error.status === 502 || error.status === 503)) {
          clearTokenState();
        }
        await delay(retryDelay);
        return requestWithRetry<T>(
          endpoint,
          payload,
          options,
          attempt + 1,
          tokenRefreshed
        );
      }
      throw new Error(formatError(error, endpoint));
    }
  };

  const request = async <T>(
    endpoint: string,
    payload: unknown = {},
    options: RequestOptions = {}
  ): Promise<T> => requestWithRetry<T>(endpoint, payload, options);

  const buildRegexdHeaders = (bookId: string | number) => ({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    Referer: `https://regexd.com/base.php?bookId=${bookId}`,
  });

  const fetchRegexdEpisode = async (bookId: string | number, chapterIndex: number) => {
    const episode = Number(chapterIndex) + 1;
    const url = new URL("https://regexd.com/base.php");
    url.searchParams.set("ajax", "1");
    url.searchParams.set("bookId", String(bookId));
    url.searchParams.set("lang", lang);
    url.searchParams.set("episode", String(episode));

    const res = await fetchFn(url.toString(), { headers: buildRegexdHeaders(bookId) });
    if (!res?.ok) return null;

    const data = await safeJson(res as any);
    const chapter = (data as { chapter?: Record<string, any> })?.chapter;
    if (!chapter) return null;

    const mp4 = chapter.mp4 as string | undefined;
    const m3u8 = chapter.m3u8Url as string | undefined;
    if (!mp4 && !m3u8) return null;

    return {
      chapterId: chapter.id ?? chapter.chapterId ?? `regex-${bookId}-${episode}`,
      chapterName: chapter.indexStr ?? chapter.chapterName ?? `EP ${episode}`,
      chapterIndex,
      videoPath: mp4 || m3u8,
      cdnList: [
        {
          videoPathList: [
            mp4 ? { quality: 1080, videoPath: mp4, isDefault: 1 } : null,
            m3u8 ? { quality: "m3u8", videoPath: m3u8, isDefault: mp4 ? 0 : 1 } : null,
          ].filter(Boolean),
        },
      ],
    };
  };

  const withCache = async <T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ) => {
    if (!cache || ttlSeconds <= 0) {
      return fetcher();
    }
    const cached = cache.get<T>(key);
    if (cached !== undefined) return cached;
    const inflightKey = `${baseUrl}|${webficUrl}|${key}`;
    const inflight = inflightRequests.get(inflightKey);
    if (inflight) return inflight as Promise<T>;

    const promise = (async () => {
      try {
        const data = await fetcher();
        cache.set(key, data, ttlSeconds);
        return data;
      } finally {
        inflightRequests.delete(inflightKey);
      }
    })();
    inflightRequests.set(inflightKey, promise);
    return promise;
  };

  const getVip = async () =>
    withCache(`vip_${lang}`, cacheTtl.dramaList, async () => {
      const payload = {
        homePageStyle: 0,
        isNeedRank: 1,
        index: 4,
        type: 0,
        channelId: 205,
      };
      return request("/drama-box/he001/theater", payload);
    });

  const getStreamUrl = async (bookId: string, episode: string | number) => {
    if (!bookId || !episode) {
      throw new Error("Parameter bookId dan episode wajib diisi.");
    }

    return withCache(
      `stream_${bookId}_${episode}_${lang}`,
      cacheTtl.chapters,
      async () => {
        const payload = {
          boundaryIndex: 0,
          comingPlaySectionId: -1,
          index: Number(episode) - 1,
          currencyPlaySource: "discover_new_rec_new",
          needEndRecommend: 0,
          currencyPlaySourceName: "",
          preLoad: false,
          rid: "",
          pullCid: "",
          loadDirection: 0,
          startUpKey: "",
          bookId,
        };

        for (let attempt = 0; attempt <= retry.maxRetries; attempt += 1) {
          try {
            return await request("/drama-box/chapterv2/batch/load", payload, {
              allowFailure: true,
            });
          } catch (error) {
            if (attempt < retry.maxRetries && isRetryableError(error)) {
              const retryDelay = getRetryDelay(attempt, retry);
              logger.warn?.(
                `[Stream] ${formatError(error)} - Retry ${attempt + 1}/${retry.maxRetries
                }...`
              );
              await delay(retryDelay);
              continue;
            }
            throw new Error(formatError(error, "Stream URL"));
          }
        }
        throw new Error("Stream URL request failed");
      }
    );
  };

  const getDramaDetail = async (
    bookId: string | number,
    needRecommend = false,
    from = "book_album"
  ) => {
    if (!bookId) {
      throw new Error("bookId is required!");
    }
    return withCache(
      `detail_${bookId}_${lang}`,
      cacheTtl.dramaDetail,
      async () =>
        request("/drama-box/chapterv2/detail", {
          needRecommend,
          from,
          bookId,
        })
    );
  };

  const getDramaDetailV2 = async (bookId: string | number) => {
    return withCache(
      `detailv2_${bookId}_${lang}`,
      cacheTtl.dramaDetail,
      async () => {
        const data = await request(
          `/webfic/book/detail/v2?id=${bookId}&language=${lang}`,
          { id: bookId, language: lang },
          { isWebfic: true, method: "GET" }
        );
        const { chapterList, book } = (data as { data?: Record<string, any> })
          ?.data || { chapterList: [], book: null };
        const chapters = (chapterList || []).map(
          (ch: { index?: number; id?: string }) => ({
            index: ch.index,
            id: ch.id,
          })
        );
        return { chapters, drama: book };
      }
    );
  };

  const getChapters = async (bookId: string | number) => {
    return withCache(
      `chapters_${bookId}_${lang}`,
      cacheTtl.chapters,
      async () => {
        const data = await request("/drama-box/chapterv2/batch/load", {
          boundaryIndex: 0,
          comingPlaySectionId: -1,
          index: 1,
          currencyPlaySource: "discover_new_rec_new",
          needEndRecommend: 0,
          currencyPlaySourceName: "",
          preLoad: false,
          rid: "",
          pullCid: "",
          loadDirection: 0,
          bookId,
        });

        const chapters =
          (data as { data?: { chapterList?: Record<string, any>[] } })?.data
            ?.chapterList || [];
        chapters.forEach((chapter) => {
          const cdn = chapter.cdnList?.find((item: { isDefault?: number }) => item.isDefault === 1);
          chapter.videoPath =
            cdn?.videoPathList?.find((item: { isDefault?: number }) => item.isDefault === 1)
              ?.videoPath || "N/A";
        });
        return chapters;
      }
    );
  };

  const batchDownload = async (bookId: string | number) => {
    let savedPayChapterNum = 0;
    let totalChapters = 0;
    const result: Record<string, any>[] = [];
    let detailChapters: Record<string, any>[] = [];

    logger.info?.("==================================================");
    logger.info?.(`Starting scrape for Book ID: ${bookId}`);
    logger.info?.("==================================================");

    const fetchBatch = async (index: number, bId: string | number, isRetry = false) => {
      try {
        const data = await request(
          "/drama-box/chapterv2/batch/load",
          {
            boundaryIndex: 0,
            comingPlaySectionId: -1,
            index,
            currencyPlaySourceName: "\u9996\u9875\u53d1\u73b0_Untukmu_\u63a8\u8350\u5217\u8868",
            rid: "",
            enterReaderChapterIndex: 0,
            loadDirection: 1,
            startUpKey: "10942710-5e9e-48f2-8927-7c387e6f5fac",
            bookId: bId,
            currencyPlaySource: "discover_175_rec",
            needEndRecommend: 0,
            preLoad: false,
            pullCid: "",
          },
          { isWebfic: false, method: "POST" }
        );

        const chapters =
          (data as { data?: { chapterList?: Record<string, any>[] } })?.data
            ?.chapterList || [];
        const isEndOfBook = index + 5 >= totalChapters && totalChapters !== 0;

        if (chapters.length <= 2 && index !== savedPayChapterNum && !isRetry && !isEndOfBook) {
          throw new Error("TriggerRetry: Data suspected limited");
        }
        if (chapters.length === 0 && index !== savedPayChapterNum) {
          throw new Error("Soft Error: Empty data");
        }

        return data;
      } catch (error) {
        if (!isRetry) {
          clearTokenState();
          await generateNewToken(now());

          if (savedPayChapterNum > 0 && index !== savedPayChapterNum) {
            await fetchBatch(savedPayChapterNum, bId, true).catch(() => { });
            await delay(batchTokenResetDelayMs);
          }
          await delay(batchTokenResetDelayMs);
          return fetchBatch(index, bId, true);
        }
        return null;
      }
    };

    try {
      // Fetch full chapter metadata first; this includes paywall flags for all eps.
      const detailData = await request("/drama-box/chapterv2/detail", {
        needRecommend: false,
        from: "book_album",
        bookId,
      });
      detailChapters = (detailData as { data?: { list?: Record<string, any>[] } })?.data
        ?.list || [];
      totalChapters =
        totalChapters ||
        (detailData as { data?: { chapterCount?: number } })?.data?.chapterCount ||
        0;
      savedPayChapterNum =
        savedPayChapterNum ||
        (detailData as { data?: { payChapterNum?: number } })?.data?.payChapterNum ||
        0;

      const firstBatchData = await fetchBatch(1, bookId);

      if ((firstBatchData as { data?: Record<string, any> })?.data) {
        const firstData = (firstBatchData as { data?: Record<string, any> }).data;
        totalChapters = firstData?.chapterCount || 0;
        savedPayChapterNum = firstData?.payChapterNum || 0;

        if (firstData?.chapterList) {
          result.push(...firstData.chapterList);
        }

        let currentIdx = 6;
        let retryLoopCount = 0;

        while (currentIdx <= totalChapters) {
          const batchData = await fetchBatch(currentIdx, bookId);
          const items =
            (batchData as { data?: { chapterList?: Record<string, any>[] } })?.data
              ?.chapterList || [];

          if (items.length > 0) {
            result.push(...items);
            currentIdx += 5;
            retryLoopCount = 0;
          } else {
            retryLoopCount += 1;
            if (retryLoopCount >= 3) {
              currentIdx += 5;
              retryLoopCount = 0;
            } else {
              await delay(batchRetryDelayMs);
            }
          }
          await delay(batchDelayMs);
        }
      }

      const uniqueMap = new Map<string, Record<string, any>>();
      result.forEach((item) => uniqueMap.set(item.chapterId, item));

      // Merge in missing chapters (usually paywalled ones) so caller sees full list.
      if (detailChapters.length > 0) {
        detailChapters.forEach((meta) => {
          if (uniqueMap.has(meta.chapterId)) {
            // attach paywall flags to existing item
            const existing = uniqueMap.get(meta.chapterId)!;
            existing.isCharge = meta.isCharge;
            existing.isPay = meta.isPay;
            existing.chapterName = existing.chapterName || meta.chapterName;
            existing.chapterIndex = existing.chapterIndex ?? meta.chapterIndex;
          } else {
            uniqueMap.set(meta.chapterId, {
              chapterId: meta.chapterId,
              chapterIndex: meta.chapterIndex,
              chapterName: meta.chapterName || `EP ${meta.chapterIndex + 1}`,
              isCharge: meta.isCharge,
              isPay: meta.isPay,
              locked: true,
              videoPath: "N/A",
            });
          }
        });
      }

      let finalResult = Array.from(uniqueMap.values())
        .sort((a, b) => (a.chapterIndex || 0) - (b.chapterIndex || 0))
        .map((chapter) => {
          const cdn =
            chapter.cdnList?.find((item: { isDefault?: number }) => item.isDefault === 1) ||
            chapter.cdnList?.[0];
          let videoPath = "N/A";
          if (cdn?.videoPathList) {
            const preferred =
              cdn.videoPathList.find((item: { isDefault?: number }) => item.isDefault === 1) ||
              cdn.videoPathList.find((item: { quality?: number }) => item.quality === 1080) ||
              cdn.videoPathList.find((item: { quality?: number }) => item.quality === 720) ||
              cdn.videoPathList[0];
            videoPath = preferred?.videoPath || "N/A";
          }

          return {
            chapterId: chapter.chapterId,
            chapterIndex: chapter.chapterIndex,
            chapterName: chapter.chapterName,
            videoPath,
            locked: videoPath === "N/A",
          };
        });

      // Try to fill locked/missing episodes via regexd.com (best-effort).
      for (const chapter of finalResult) {
        if (!chapter || chapter.videoPath !== "N/A") continue;
        try {
          const fallback = await fetchRegexdEpisode(bookId, chapter.chapterIndex ?? 0);
          if (fallback?.videoPath) {
            chapter.videoPath = fallback.videoPath;
            chapter.locked = false;
          }
        } catch (err) {
          logger.warn?.(
            `[BatchDownload] regexd fallback fail for ${chapter.chapterIndex}: ${formatError(err)}`
          );
        }
      }

      logger.info?.("==================================================");
      logger.info?.(`Finished. Clean output: ${finalResult.length} episodes`);
      logger.info?.("==================================================");

      return finalResult;
    } catch (error) {
      logger.error?.("Critical error in batchDownload:", error);
      return [];
    }
  };

  const getDramaList = async (pageNo = 1, pageSize = 10) =>
    withCache(`list_${pageNo}_${pageSize}_${lang}`, cacheTtl.dramaList, async () => {
      const data = await request("/drama-box/he001/classify", {
        typeList:
          pageNo === 1
            ? []
            : [
              { type: 1, value: "" },
              { type: 2, value: "" },
              { type: 3, value: "" },
              { type: 4, value: "" },
              { type: 4, value: "" },
              { type: 5, value: "1" },
            ],
        showLabels: false,
        pageNo: pageNo.toString(),
        pageSize: pageSize.toString(),
      });

      const rawList =
        (data as { data?: { classifyBookList?: { records?: Record<string, any>[] } } })
          ?.data?.classifyBookList?.records || [];
      const isMore =
        (data as { data?: { classifyBookList?: { isMore?: number } } })?.data
          ?.classifyBookList?.isMore || 0;

      const list = rawList.flatMap((item) => {
        if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
          return item.tagCardVo.tagBooks;
        }
        return [item];
      });

      const uniqueList = list.filter(
        (value, index, array) =>
          array.findIndex((book) => book.bookId === value.bookId) === index
      );

      return {
        isMore: isMore === 1,
        book: uniqueList.map((book) => ({
          id: book.bookId,
          name: book.bookName,
          cover: book.coverWap,
          chapterCount: book.chapterCount,
          introduction: book.introduction,
          tags: book.tagV3s,
          playCount: book.playCount,
          cornerName: book.corner?.name || null,
          cornerColor: book.corner?.color || null,
        })),
      };
    });

  const getCategories = async (pageNo = 1, pageSize = 30) =>
    withCache(
      `categories_${pageNo}_${pageSize}_${lang}`,
      cacheTtl.categories,
      async () => {
        const data = await request(
          "/webfic/home/browse",
          { typeTwoId: 0, pageNo, pageSize },
          { isWebfic: true }
        );
        return (data as { data?: { types?: Record<string, any>[] } })?.data
          ?.types || [];
      }
    );

  const getBookFromCategories = async (
    typeTwoId = 0,
    pageNo = 1,
    pageSize = 30
  ) =>
    withCache(
      `category_${typeTwoId}_${pageNo}_${pageSize}_${lang}`,
      cacheTtl.dramaList,
      async () => {
        const data = await request(
          "/webfic/home/browse",
          { typeTwoId, pageNo, pageSize },
          { isWebfic: true }
        );
        return (data as { data?: Record<string, any> })?.data || [];
      }
    );

  const getRecommendedBooks = async () =>
    withCache(`recommend_${lang}`, cacheTtl.dramaList, async () => {
      const data = await request("/drama-box/he001/recommendBook", {
        isNeedRank: 1,
        newChannelStyle: 1,
        specialColumnId: 0,
        pageNo: 1,
        channelId: 43,
      });

      const rawList =
        (data as { data?: { recommendList?: { records?: Record<string, any>[] } } })
          ?.data?.recommendList?.records || [];
      const list = rawList.flatMap((item) => {
        if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
          return item.tagCardVo.tagBooks;
        }
        return [item];
      });

      return list.filter(
        (value, index, array) =>
          array.findIndex((book) => book.bookId === value.bookId) === index
      );
    });

  const rsearchDrama = async (keyword: string, pageNo = 3) => {
    const data = await request("/drama-box/search/suggest", { keyword, pageNo });
    return ((data as { data?: { suggestList?: Record<string, any>[] } })?.data
      ?.suggestList || []).map((item) => ({
        bookId: item.bookId,
        bookName: item.bookName.replace(/\s+/g, "-"),
        cover: item.cover,
      }));
  };

  const searchDramaIndex = async () =>
    withCache(`searchIndex_${lang}`, cacheTtl.search, async () => {
      const data = await request("/drama-box/search/index");
      return (data as { data?: { hotVideoList?: Record<string, any>[] } })?.data
        ?.hotVideoList || [];
    });

  const searchDrama = async (keyword: string, pageNo = 1, pageSize = 20) =>
    withCache(
      `search_${keyword}_${pageNo}_${pageSize}_${lang}`,
      cacheTtl.search,
      async () => {
        const data = await request("/drama-box/search/search", {
          searchSource: "\u641c\u7d22\u6309\u94ae",
          pageNo,
          pageSize,
          from: "search_sug",
          keyword,
        });

        const rawResult =
          (data as { data?: { searchList?: Record<string, any>[] } })?.data
            ?.searchList || [];
        const isMore =
          (data as { data?: { isMore?: number } })?.data?.isMore || 0;

        return {
          isMore: isMore === 1,
          book: rawResult.map((book) => ({
            id: book.bookId,
            name: book.bookName,
            cover: book.cover,
            introduction: book.introduction,
            tags: book.tagNames,
            playCount: book.playCount,
          })),
        };
      }
    );

  const clearCache = () => {
    if (cache) {
      cache.clear();
    }
    tokenCache = null;
  };

  const getCacheStats = () => (cache?.stats ? cache.stats() : {});

  return {
    util,
    request,
    getVip,
    getStreamUrl,
    getDramaDetail,
    getDramaDetailV2,
    getChapters,
    batchDownload,
    getDramaList,
    getCategories,
    getBookFromCategories,
    getRecommendedBooks,
    rsearchDrama,
    searchDramaIndex,
    searchDrama,
    clearCache,
    getCacheStats,
  };
};

export default createDramaboxHelper;
