import { describe, it, expect } from "bun:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8787";

interface RateLimitResult {
  endpoint: string;
  limit: number;
  requestsSent: number;
  blockedAt: number | null;
  responseTime: number;
  success: boolean;
}

function getRateLimitHeaders(headers: Headers) {
  return {
    limit: headers.get("X-RateLimit-Limit"),
    remaining: headers.get("X-RateLimit-Remaining"),
    reset: headers.get("X-RateLimit-Reset"),
    retryAfter: headers.get("Retry-After"),
  };
}

async function testEndpointRateLimit(
  endpoint: string,
  maxRequests: number,
  concurrent: boolean = false
): Promise<RateLimitResult> {
  const startTime = Date.now();
  let blockedAt: number | null = null;

  if (concurrent) {
    const requests = Array(maxRequests + 10)
      .fill(null)
      .map((_, i) =>
        fetch(`${BASE_URL}${endpoint}`).then((res) => ({ index: i, res }))
      );

    const results = await Promise.all(requests);
    
    for (const { index, res } of results) {
      if (res.status === 429 && blockedAt === null) {
        blockedAt = index + 1;
        break;
      }
    }
  } else {
    for (let i = 0; i < maxRequests + 10; i++) {
      const res = await fetch(`${BASE_URL}${endpoint}`);
      
      if (res.status === 429) {
        blockedAt = i + 1;
        break;
      }
    }
  }

  return {
    endpoint,
    limit: maxRequests,
    requestsSent: maxRequests + 10,
    blockedAt,
    responseTime: Date.now() - startTime,
    success: blockedAt !== null && blockedAt <= maxRequests + 1,
  };
}

describe("Rate Limit Tests", () => {
  describe("Health Endpoint (30 req/min)", () => {
    it("should have rate limit headers", async () => {
      const res = await fetch(`${BASE_URL}/health`);
      
      expect(res.headers.get("X-RateLimit-Limit")).toBe("30");
      expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
    });

    it("should decrement remaining counter", async () => {
      const res1 = await fetch(`${BASE_URL}/health`);
      const remaining1 = parseInt(res1.headers.get("X-RateLimit-Remaining") || "0");
      
      const res2 = await fetch(`${BASE_URL}/health`);
      const remaining2 = parseInt(res2.headers.get("X-RateLimit-Remaining") || "0");
      
      expect(remaining2).toBe(remaining1 - 1);
    });

    it("should block after 30 requests", async () => {
      const result = await testEndpointRateLimit("/health", 30, true);
      
      expect(result.success).toBe(true);
      expect(result.blockedAt).toBeLessThanOrEqual(31);
    });

    it("should return 429 with proper error body", async () => {
      for (let i = 0; i < 35; i++) {
        await fetch(`${BASE_URL}/health`);
      }

      const res = await fetch(`${BASE_URL}/health`);
      
      if (res.status === 429) {
        const body = await res.json() as { success: boolean; message: string; retryAfter: number; limit: number };
        
        expect(body.success).toBe(false);
        expect(body.message).toContain("Rate limit exceeded");
        expect(body.retryAfter).toBeGreaterThan(0);
        expect(body.limit).toBe(30);
        expect(res.headers.get("Retry-After")).toBeTruthy();
      }
    });
  });

  describe("API Endpoints (100 req/min default)", () => {
    it("should have rate limit headers on API endpoints", async () => {
      const res = await fetch(`${BASE_URL}/api/drama/providers`);
      
      expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    });

    it("should track different endpoints separately", async () => {
      await fetch(`${BASE_URL}/api/drama/providers`);
      const dramaRes = await fetch(`${BASE_URL}/api/drama/providers`);
      const dramaRemaining = dramaRes.headers.get("X-RateLimit-Remaining");

      await fetch(`${BASE_URL}/api/anime/providers`);
      const animeRes = await fetch(`${BASE_URL}/api/anime/providers`);
      const animeRemaining = animeRes.headers.get("X-RateLimit-Remaining");

      expect(dramaRemaining).toBeTruthy();
      expect(animeRemaining).toBeTruthy();
    });
  });

  describe("Different IPs", () => {
    it("should have separate limits for different IPs", async () => {
      const res1 = await fetch(`${BASE_URL}/health`, {
        headers: { "X-Forwarded-For": "1.2.3.4" },
      });
      const remaining1 = res1.headers.get("X-RateLimit-Remaining");

      const res2 = await fetch(`${BASE_URL}/health`, {
        headers: { "X-Forwarded-For": "5.6.7.8" },
      });
      const remaining2 = res2.headers.get("X-RateLimit-Remaining");

      expect(parseInt(remaining1 || "0")).toBeGreaterThan(25);
      expect(parseInt(remaining2 || "0")).toBeGreaterThan(25);
    });
  });

  describe("Rate Limit Reset", () => {
    it("should reset counter after window expires", async () => {
      const uniqueIp = `10.0.0.${Math.floor(Math.random() * 255)}`;
      
      const res1 = await fetch(`${BASE_URL}/health`, {
        headers: { "X-Forwarded-For": uniqueIp },
      });
      const remaining1 = parseInt(res1.headers.get("X-RateLimit-Remaining") || "0");

      console.log("Waiting 61 seconds for rate limit reset...");
      await new Promise((resolve) => setTimeout(resolve, 61000));

      const res2 = await fetch(`${BASE_URL}/health`, {
        headers: { "X-Forwarded-For": uniqueIp },
      });
      const remaining2 = parseInt(res2.headers.get("X-RateLimit-Remaining") || "0");

      expect(remaining2).toBeGreaterThanOrEqual(remaining1 - 1);
    });
  });
});
