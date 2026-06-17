# Test Suite Documentation

Test suite untuk Bun Drama API menggunakan Bun's built-in test runner.

## 📁 File Structure

```
src/test/
├── README.md              # Dokumentasi ini
├── rate-limit.test.ts     # Rate limiting tests
├── functional.test.ts     # Functional/endpoint tests
└── integration.test.ts    # Integration & E2E tests
```

## 🚀 Quick Start

```bash
# Run all tests
bun run test

# Run specific test suites
bun run test:rate-limit      # Rate limiting only
bun run test:functional      # Functional tests only
bun run test:integration     # Integration tests only

# Watch mode (auto-rerun on file changes)
bun run test:watch

# With coverage report
bun run test:coverage

# CI mode (runs functional + integration, excludes rate-limit)
bun run test:ci
```

## 🧪 Test Categories

### 1. Rate Limit Tests (`rate-limit-test.ts`)

Menguji rate limiting functionality:

| Test | Deskripsi |
|------|-----------|
| Headers Check | Verifikasi `X-RateLimit-*` headers |
| Counter Decrement | Cek penurunan remaining counter |
| Blocking | Verifikasi blocking setelah limit |
| 429 Response | Format error response saat limit |
| Different IPs | Rate limit terpisah per IP |
| Reset Window | Counter reset setelah 1 menit |

**Config:**
- Health endpoint: 30 req/menit
- API endpoints: 100 req/menit

```bash
# Run rate limit tests
bun run test:rate-limit

# Atau langsung
bun test src/test/rate-limit.test.ts
```

### 2. Functional Tests (`functional-test.ts`)

Menguji semua endpoint individual:

| Kategori | Endpoint |
|----------|----------|
| Health | `/health`, `/api/home` |
| Drama | `/api/drama/*` (Dramabox, Melolo) |
| Anime | `/api/anime/*` (AnimeKai, Hianime, AnimePahe, v2) |
| Manga | `/api/manga/*` (MangaHere, Komikku) |
| Movies | `/api/movies/*` (FlixHQ, Rebahin) |
| Auth | `/api/auth/*` |
| Docs | `/docs`, `/docs/openapi.json` |

```bash
bun run test:functional
```

### 3. Integration Tests (`integration-test.ts`)

Menguji end-to-end workflows:

| Workflow | Alur |
|----------|------|
| Drama Flow | Search → Detail → Stream |
| Anime Flow | Search → Detail → Stream |
| Movie Flow | Search → Detail → Stream |
| Manga Flow | Search → Detail → Chapters |
| Homepage | Aggregation dari multiple sources |

Plus:
- Concurrent request handling
- Security (SQL injection, XSS)
- CORS
- Performance benchmarks

```bash
bun run test:integration
```

## ⚙️ Configuration

### Environment Variables

```bash
# Override base URL untuk testing
export TEST_BASE_URL="http://localhost:8787"

# Run dengan custom URL
TEST_BASE_URL="https://api.example.com" bun run test
```

### Test Timeout

Bun test menggunakan default timeout. Jika perlu timeout lebih lama, gunakan:
```bash
bun test --timeout 60000
```

## 📝 Writing Tests

### Contoh Test Sederhana

```typescript
import { describe, it, expect } from "bun:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8787";

describe("My Feature", () => {
  it("should do something", async () => {
    const res = await fetch(`${BASE_URL}/api/endpoint`);
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
```

### Helper Functions

```typescript
// API request helper
async function apiRequest(path: string, options?: RequestInit) {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

// Rate limit header checker
function getRateLimitHeaders(headers: Headers) {
  return {
    limit: headers.get("X-RateLimit-Limit"),
    remaining: headers.get("X-RateLimit-Remaining"),
    reset: headers.get("X-RateLimit-Reset"),
  };
}
```

## 🔧 Tips

1. **Jangan run rate limit test bersama functional test** karena rate limit test akan exhaust quota dan membuat functional test gagal.

2. **Routes Structure:**
   - Drama: `/api/drama/dramabox/*`, `/api/drama/melolo/*`
   - Anime: `/api/anime/animein/*`, `/api/anime/samehadaku/*`, `/api/anime/aniwatch/*`
   - Manga: `/api/manga/mangahere/*`, `/api/manga/komikku/*`
   - Movies: `/api/movies/flixhq/*`, `/api/movies/rebahin/*`, `/api/movies/lk21/*`
   - Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/get-token`, `/api/auth/register-token`, `/api/auth/logout`
   - User: `/api/user/get`, `/api/user/delete/:id`

2. **Gunakan IP yang berbeda** untuk test rate limit reset:
   ```typescript
   headers: { "X-Forwarded-For": "10.0.0.1" }
   ```

3. **Skip test jika data tidak tersedia**:
   ```typescript
   if (!body.data || body.data.length === 0) {
     console.log("⚠️  Skipping test - no data available");
     return;
   }
   ```

4. **Test dengan environment yang berbeda**:
   ```bash
   # Test local
   bun run test
   
   # Test production
   TEST_BASE_URL="https://api.example.com" bun run test:functional
   ```

## 🐛 Troubleshooting

### Test gagal karena rate limit
```bash
# Tunggu 1 menit untuk reset, atau
# Run test tanpa rate limit tests
bun run test:ci
```

### Connection refused
```bash
# Pastikan server berjalan
bun run dev  # atau
bun run start
```

### Timeout errors
```bash
# Increase timeout globally
bun test --timeout 60000
```

## 📊 Coverage Report

```bash
# Generate coverage report
bun run test:coverage

# Output akan menunjukkan coverage per file
```
