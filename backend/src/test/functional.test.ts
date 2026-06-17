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

describe("Homepage & Health", () => {
  it("should return health status", async () => {
    const res = await apiRequest("/health");
    expect(res.status).toBe(200);

    const body = await res.json() as { message: string; version: string };
    expect(body.message).toBe("OK!");
    expect(body.version).toBeTruthy();
  });

  it("should return homepage data", async () => {
    const res = await apiRequest("/api/home");
    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean; data: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});

describe("Drama Endpoints", () => {
  describe("GET /api/drama/providers", () => {
    it("should list all drama providers", async () => {
      const res = await apiRequest("/api/drama/providers");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("Dramabox Provider", () => {
    it("should get recommendations", async () => {
      const res = await apiRequest("/api/drama/dramabox/recommendations");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean; source: string };
      expect(body.success).toBe(true);
      expect(body.source).toBe("dramabox");
    });

    it("should get new releases", async () => {
      const res = await apiRequest("/api/drama/dramabox/new-release");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean; data: unknown };
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it("should get rankings", async () => {
      const res = await apiRequest("/api/drama/dramabox/rank");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });

    it("should search dramas", async () => {
      const res = await apiRequest("/api/drama/dramabox/search?query=love");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });

    it("should get drama details", async () => {
      const listRes = await apiRequest("/api/drama/dramabox/recommendations");
      const listBody = await listRes.json() as { data?: { id: string }[] };

      if (listBody.data && listBody.data.length > 0) {
        const dramaId = listBody.data[0].id;
        const res = await apiRequest(`/api/drama/dramabox/detail/${dramaId}`);
        expect(res.status).toBe(200);

        const body = await res.json() as { success: boolean };
        expect(body.success).toBe(true);
      }
    });

    it("should get genres list", async () => {
      const res = await apiRequest("/api/drama/dramabox/genre");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });

    it("should get languages", async () => {
      const res = await apiRequest("/api/drama/dramabox/languages");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  describe("Melolo Provider", () => {
    it("should get recommendations", async () => {
      const res = await apiRequest("/api/drama/melolo/recommendations");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean; source: string };
      expect(body.success).toBe(true);
      expect(body.source).toBe("melolo");
    });

    it("should get new releases", async () => {
      const res = await apiRequest("/api/drama/melolo/new-release");
      expect(res.status).toBe(200);
    });

    it("should search dramas", async () => {
      const res = await apiRequest("/api/drama/melolo/search?query=ceo");
      expect(res.status).toBe(200);
    });

    it("should get series details", async () => {
      const listRes = await apiRequest("/api/drama/melolo/recommendations");
      const listBody = await listRes.json() as { data?: { id: string }[] };

      if (listBody.data && listBody.data.length > 0) {
        const seriesId = listBody.data[0].id;
        const res = await apiRequest(`/api/drama/melolo/detail/${seriesId}`);
        expect(res.status).toBe(200);
      }
    });
  });
});

describe("Anime Endpoints", () => {
  describe("GET /api/anime/providers", () => {
    it("should list all anime providers", async () => {
      const res = await apiRequest("/api/anime/providers");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean; data: unknown[] };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("Animein Provider", () => {
    it("should get recommendations", async () => {
      const res = await apiRequest("/api/anime/animein/recommendations");
      expect(res.status).toBe(200);
    });

    it("should search anime", async () => {
      const res = await apiRequest("/api/anime/animein/search?query=demon%20slayer");
      expect(res.status).toBe(200);
    });
  });

  // describe("Tensei Provider", () => {
  //   it("should get recommendations", async () => {
  //     const res = await apiRequest("/api/anime/tensei/recommendations");
  //     expect(res.status).toBe(200);
  //   });
  // });
});

describe("Manga Endpoints", () => {
  describe("GET /api/manga/providers", () => {
    it("should list all manga providers", async () => {
      const res = await apiRequest("/api/manga/providers");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  describe("MangaHere Provider", () => {
    it("should get recommendations", async () => {
      const res = await apiRequest("/api/manga/mangahere/recommendations");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });

    it("should get new releases", async () => {
      const res = await apiRequest("/api/manga/mangahere/new-release");
      expect(res.status).toBe(200);
    });

    it("should search manga", async () => {
      const res = await apiRequest("/api/manga/mangahere/search?query=one%20piece");
      expect(res.status).toBe(200);
    });
  });

  describe("Komikku Provider", () => {
    it("should get recommendations", async () => {
      const res = await apiRequest("/api/manga/komikku/recommendations");
      expect(res.status).toBe(200);
    });

    it("should get genre list", async () => {
      const res = await apiRequest("/api/manga/komikku/genre");
      expect(res.status).toBe(200);
    });
  });
});

describe("Movie Endpoints", () => {
  describe("GET /api/movies/providers", () => {
    it("should list all movie providers", async () => {
      const res = await apiRequest("/api/movies/providers");
      expect(res.status).toBe(200);

      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  describe("FlixHQ Provider", () => {
    it("should get recommendations", async () => {
      const res = await apiRequest("/api/movies/flixhq/recommendations");
      expect(res.status).toBe(200);
    });

    it("should get new releases", async () => {
      const res = await apiRequest("/api/movies/flixhq/new-release");
      expect(res.status).toBe(200);
    });

    it("should get genre list", async () => {
      const res = await apiRequest("/api/movies/flixhq/genre");
      expect(res.status).toBe(200);
    });

    it("should get country list", async () => {
      const res = await apiRequest("/api/movies/flixhq/country");
      expect(res.status).toBe(200);
    });
  });

  describe("Rebahin Provider", () => {
    it("should get recommendations", async () => {
      const res = await apiRequest("/api/movies/rebahin/recommendations");
      expect(res.status).toBe(200);
    });

    it("should get new releases", async () => {
      const res = await apiRequest("/api/movies/rebahin/new-release");
      expect(res.status).toBe(200);
    });

    it("should get genre list", async () => {
      const res = await apiRequest("/api/movies/rebahin/genre");
      expect(res.status).toBe(200);
    });

    it("should get country list", async () => {
      const res = await apiRequest("/api/movies/rebahin/country");
      expect(res.status).toBe(200);
    });

    it("should search movies", async () => {
      const res = await apiRequest("/api/movies/rebahin/search?query=marvel");
      expect(res.status).toBe(200);
    });
  });

  describe("LK21 Provider", () => {
    it("should get recommendations", async () => {
      const res = await apiRequest("/api/movies/lk21/recommendations");
      expect(res.status).toBe(200);
    });
  });
});

describe("Auth Endpoints", () => {
  describe("POST /api/auth/login", () => {
    it("should reject invalid credentials", async () => {
      const res = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: "invaliduser",
          password: "wrongpassword",
        }),
      });

      expect(res.status).toBe(401);
    });

    it("should require username and password", async () => {
      const res = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/register", () => {
    it("should require all fields", async () => {
      const res = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: "testuser",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/get-token", () => {
    it("should require valid credentials", async () => {
      const res = await apiRequest("/api/auth/get-token", {
        method: "POST",
        body: JSON.stringify({
          username: "invaliduser",
          password: "wrongpassword",
        }),
      });

      expect([401, 404]).toContain(res.status);
    });
  });
});

describe("User Endpoints", () => {
  describe("GET /api/user/get", () => {
    it("should require authentication", async () => {
      const res = await apiRequest("/api/user/get");
      expect([401, 403]).toContain(res.status);
    });
  });
});

describe("API Documentation", () => {
  it("should serve OpenAPI spec", async () => {
    const res = await apiRequest("/openapi.json");
    expect(res.status).toBe(200);

    const body = await res.json() as { openapi?: string };
    expect(body.openapi).toBeDefined();
  });

  it("should serve Scalar docs", async () => {
    const res = await apiRequest("/");
    expect(res.status).toBe(200);
  });
});

describe("Error Handling", () => {
  it("should return 404 for unknown routes", async () => {
    const res = await apiRequest("/api/unknown-route");
    expect(res.status).toBe(404);
  });

  it("should return proper error format", async () => {
    const res = await apiRequest("/api/drama/dramabox/detail/invalid-id");

    const body = await res.json() as { message: string };
    expect(body.message).toBeDefined();
  });
});
