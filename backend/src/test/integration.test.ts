import { describe, it, expect } from "bun:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8787";

async function apiRequest(path: string, options?: RequestInit) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return res;
}

describe("End-to-End Workflows", () => {
  describe("Drama Search → Detail → Stream Flow", () => {
    it("should complete full drama workflow (Dramabox)", async () => {
      const searchRes = await apiRequest("/api/drama/dramabox/search?query=love");
      expect(searchRes.status).toBe(200);

      const searchBody = await searchRes.json() as { success: boolean; data?: { id: string }[] };
      expect(searchBody.success).toBe(true);

      if (!searchBody.data || searchBody.data.length === 0) {
        console.log("No search results, skipping detail/stream test");
        return;
      }

      const dramaId = searchBody.data[0].id;
      console.log(`Found drama ID: ${dramaId}`);

      const detailRes = await apiRequest(`/api/drama/dramabox/detail/${dramaId}`);
      expect(detailRes.status).toBe(200);

      const detailBody = await detailRes.json() as { success: boolean; data: unknown };
      expect(detailBody.success).toBe(true);
      expect(detailBody.data).toBeDefined();

      const streamRes = await apiRequest(`/api/drama/dramabox/stream/${dramaId}`);
      expect(streamRes.status).toBe(200);
    });

    it("should complete full drama workflow (Melolo)", async () => {
      const recRes = await apiRequest("/api/drama/melolo/recommendations");
      expect(recRes.status).toBe(200);

      const recBody = await recRes.json() as { data?: { id: string }[] };
      if (!recBody.data || recBody.data.length === 0) {
        console.log("No recommendations, skipping test");
        return;
      }

      const seriesId = recBody.data[0].id;

      const detailRes = await apiRequest(`/api/drama/melolo/detail/${seriesId}`);
      expect(detailRes.status).toBe(200);

      const detailBody = await detailRes.json() as { data?: { chapters?: { chapterId: string }[] } };
      if (!detailBody.data?.chapters || detailBody.data.chapters.length === 0) {
        console.log("No chapters found, skipping stream test");
        return;
      }

      const chapterId = detailBody.data.chapters[0].chapterId;
      const streamRes = await apiRequest(`/api/drama/melolo/stream/${chapterId}`);
      expect(streamRes.status).toBe(200);
    });
  });

  describe("Anime Search → Detail → Stream Flow", () => {
    it("should complete full anime workflow (Animein)", async () => {
      const searchRes = await apiRequest("/api/anime/animein/search?query=naruto");
      expect(searchRes.status).toBe(200);

      const searchBody = await searchRes.json() as { data?: { id: string }[] };
      if (!searchBody.data || searchBody.data.length === 0) {
        console.log("No search results, skipping test");
        return;
      }

      const animeId = searchBody.data[0].id;

      const detailRes = await apiRequest(`/api/anime/animein/detail/${animeId}`);
      expect(detailRes.status).toBe(200);

      const detailBody = await detailRes.json() as { data?: { chapters?: { chapterId: string }[] } };
      if (!detailBody.data?.chapters || detailBody.data.chapters.length === 0) {
        console.log("No chapters found, skipping stream test");
        return;
      }

      const episodeId = detailBody.data.chapters[0].chapterId;
      const streamRes = await apiRequest(`/api/anime/animein/stream/${episodeId}`);
      expect([200, 500, 404]).toContain(streamRes.status);
    });

    // it("should complete full anime workflow (Tensei)", async () => {
    //   const searchRes = await apiRequest("/api/anime/tensei/search?query=naruto");
    //   expect(searchRes.status).toBe(200);

    //   const searchBody = await searchRes.json() as { data?: { id: string }[] };
    //   if (!searchBody.data || searchBody.data.length === 0) {
    //     console.log("No search results, skipping test");
    //     return;
    //   }

    //   const animeId = searchBody.data[0].id;

    //   const detailRes = await apiRequest(`/api/anime/tensei/detail/${animeId}`);
    //   expect(detailRes.status).toBe(200);

    //   const detailBody = await detailRes.json() as { data?: { chapters?: { chapterId: string }[] } };
    //   if (!detailBody.data?.chapters || detailBody.data.chapters.length === 0) {
    //     console.log("No chapters found, skipping stream test");
    //     return;
    //   }

    //   const chapterId = detailBody.data.chapters[0].chapterId;
    //   const streamRes = await apiRequest(`/api/anime/tensei/stream/${chapterId}`);
    //   expect([200, 500, 404]).toContain(streamRes.status);
    // });
  });

  describe("Movie Search → Detail → Stream Flow", () => {
    it("should complete full movie workflow (Rebahin)", async () => {
      const searchRes = await apiRequest("/api/movies/rebahin/search?query=action");
      expect(searchRes.status).toBe(200);

      const searchBody = await searchRes.json() as { data?: { id: string }[] };
      if (!searchBody.data || searchBody.data.length === 0) {
        console.log("No search results, skipping test");
        return;
      }

      const movieId = searchBody.data[0].id;

      const detailRes = await apiRequest(`/api/movies/rebahin/detail/${movieId}`);
      expect(detailRes.status).toBe(200);

      const streamRes = await apiRequest(`/api/movies/rebahin/stream/${movieId}`);
      expect([200, 500, 404]).toContain(streamRes.status);
    });

    it("should complete full movie workflow (FlixHQ)", async () => {
      const recRes = await apiRequest("/api/movies/flixhq/recommendations");
      expect(recRes.status).toBe(200);

      const recBody = await recRes.json() as { data?: { id: string }[] };
      if (!recBody.data || recBody.data.length === 0) {
        console.log("No recommendations, skipping test");
        return;
      }

      const movieId = recBody.data[0].id;

      const detailRes = await apiRequest(`/api/movies/flixhq/detail?id=${movieId}`);
      expect([200, 400, 404]).toContain(detailRes.status);
    });

    it("should complete full movie workflow (LK21)", async () => {
      const recRes = await apiRequest("/api/movies/lk21/recommendations");
      expect(recRes.status).toBe(200);

      const recBody = await recRes.json() as { success: boolean };
      expect(recBody.success).toBe(true);
    });
  });

  describe("Manga Search → Detail → Chapters Flow", () => {
    it("should complete full manga workflow (MangaHere)", async () => {
      const searchRes = await apiRequest("/api/manga/mangahere/search?query=one%20piece");
      expect(searchRes.status).toBe(200);

      const searchBody = await searchRes.json() as { data?: { id: string }[] };
      if (!searchBody.data || searchBody.data.length === 0) {
        console.log("No search results, skipping test");
        return;
      }

      const mangaId = searchBody.data[0].id;

      const detailRes = await apiRequest(`/api/manga/mangahere/detail/${mangaId}`);
      expect(detailRes.status).toBe(200);

      const detailBody = await detailRes.json() as { data?: { chapters?: { chapterId: string }[] } };
      if (!detailBody.data?.chapters || detailBody.data.chapters.length === 0) {
        console.log("No chapters found, skipping chapters test");
        return;
      }

      const chapterId = detailBody.data.chapters[0].chapterId;
      const chapterRes = await apiRequest(`/api/manga/mangahere/chapters?id=${chapterId}`);
      expect(chapterRes.status).toBe(200);
    });

    it("should complete full manga workflow (Komikku)", async () => {
      const recRes = await apiRequest("/api/manga/komikku/recommendations");
      expect(recRes.status).toBe(200);

      const recBody = await recRes.json() as { data?: { id: string }[] };
      if (!recBody.data || recBody.data.length === 0) {
        console.log("No recommendations, skipping test");
        return;
      }

      const mangaId = recBody.data[0].id;

      const detailRes = await apiRequest(`/api/manga/komikku/detail/${mangaId}`);
      expect([200, 404]).toContain(detailRes.status);
    });
  });
});

describe("Homepage Aggregation", () => {
  it("should aggregate data from multiple sources", async () => {
    const res = await apiRequest("/api/home");
    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean; data: unknown; source?: string };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});

describe("Cross-Provider Consistency", () => {
  it("should have consistent response format across drama providers", async () => {
    const dramaboxRes = await apiRequest("/api/drama/dramabox/recommendations");
    const meloloRes = await apiRequest("/api/drama/melolo/recommendations");

    const dramaboxBody = await dramaboxRes.json() as { success: boolean; source: string };
    const meloloBody = await meloloRes.json() as { success: boolean; source: string };

    expect(dramaboxBody.success).toBeDefined();
    expect(meloloBody.success).toBeDefined();
    expect(dramaboxBody.source).toBeDefined();
    expect(meloloBody.source).toBeDefined();
  });

  it("should have consistent response format across anime providers", async () => {
    const animeinRes = await apiRequest("/api/anime/animein/recommendations");
    const samehadakuRes = await apiRequest("/api/anime/samehadaku/recommendations");
    const aniwatchRes = await apiRequest("/api/anime/aniwatch/recommendations");

    const animeinBody = await animeinRes.json() as { success: boolean };
    const samehadakuBody = await samehadakuRes.json() as { success: boolean };
    const aniwatchBody = await aniwatchRes.json() as { success: boolean };

    expect(animeinBody.success).toBeDefined();
    expect(samehadakuBody.success).toBeDefined();
    expect(aniwatchBody.success).toBeDefined();
  });

  it("should have consistent response format across movie providers", async () => {
    const flixRes = await apiRequest("/api/movies/flixhq/recommendations");
    const rebahinRes = await apiRequest("/api/movies/rebahin/recommendations");
    const lk21Res = await apiRequest("/api/movies/lk21/recommendations");

    const flixBody = await flixRes.json() as { success: boolean };
    const rebahinBody = await rebahinRes.json() as { success: boolean };
    const lk21Body = await lk21Res.json() as { success: boolean };

    expect(flixBody.success).toBeDefined();
    expect(rebahinBody.success).toBeDefined();
    expect(lk21Body.success).toBeDefined();
  });

  it("should have consistent response format across manga providers", async () => {
    const mangahereRes = await apiRequest("/api/manga/mangahere/recommendations");
    const komikkuRes = await apiRequest("/api/manga/komikku/recommendations");

    const mangahereBody = await mangahereRes.json() as { success: boolean };
    const komikkuBody = await komikkuRes.json() as { success: boolean };

    expect(mangahereBody.success).toBeDefined();
    expect(komikkuBody.success).toBeDefined();
  });
});

describe("Performance Tests", () => {
  it("should respond to health check within 1 second", async () => {
    const start = Date.now();
    const res = await apiRequest("/health");
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(1000);
  });

  it("should handle concurrent requests", async () => {
    const requests = Array(10)
      .fill(null)
      .map(() => apiRequest("/api/drama/providers"));

    const start = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - start;

    for (const res of results) {
      expect(res.status).toBe(200);
    }

    expect(duration).toBeLessThan(10000);
  });
});

describe("Security Tests", () => {
  it("should handle SQL injection attempts", async () => {
    const res = await apiRequest("/api/drama/dramabox/search?query=' OR 1=1 --");
    expect([200, 400, 500]).toContain(res.status);
  });

  it("should handle XSS attempts", async () => {
    const res = await apiRequest("/api/drama/dramabox/search?query=<script>alert(1)</script>");
    expect([200, 400, 500]).toContain(res.status);
  });

  it("should handle very long query strings", async () => {
    const longQuery = "a".repeat(1000);
    const res = await apiRequest(`/api/drama/dramabox/search?query=${longQuery}`);
    expect([200, 400, 414, 500]).toContain(res.status);
  });

  it("should reject requests with invalid content type", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "invalid data",
    });
    expect([400, 415, 422]).toContain(res.status);
  });
});

describe("CORS Tests", () => {
  it("should include CORS headers for API endpoints", async () => {
    const res = await apiRequest("/api/drama/providers", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
  });

  it("should handle OPTIONS preflight", async () => {
    const res = await fetch(`${BASE_URL}/api/drama/providers`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
      },
    });

    expect(res.status).toBe(204);
  });
});

describe("Auth Workflows", () => {
  it("should reject access to protected user endpoints without auth", async () => {
    const res = await apiRequest("/api/user/get");
    expect([401, 403]).toContain(res.status);
  });

  it("should handle login with invalid credentials", async () => {
    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: "nonexistentuser",
        password: "wrongpassword",
      }),
    });
    expect([401, 404]).toContain(res.status);
  });

  it("should handle login with missing fields", async () => {
    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("should handle register with missing fields", async () => {
    const res = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: "testuser",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("should handle token generation with invalid credentials", async () => {
    const res = await apiRequest("/api/auth/get-token", {
      method: "POST",
      body: JSON.stringify({
        username: "nonexistent",
        password: "wrongpassword",
      }),
    });
    expect([401, 404]).toContain(res.status);
  });

  // it("should handle token registration with missing fields", async () => {
  //   const res = await apiRequest("/api/auth/register-token", {
  //     method: "POST",
  //     body: JSON.stringify({}),
  //   });
  //   expect([400, 404]).toContain(res.status);
  // });

  it("should handle logout without session", async () => {
    const res = await apiRequest("/api/auth/logout", {
      method: "POST",
    });
    expect([200, 401]).toContain(res.status);
  });
});
