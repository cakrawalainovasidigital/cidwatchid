# Dual Database Setup Guide

Panduan setup database berbeda untuk VPS (SQLite) dan Workers (D1).

## 📋 Ringkasan Arsitektur

| Environment | Database | Teknologi | File |
|-------------|----------|-----------|------|
| **VPS (Local/Server)** | SQLite | Prisma + SQLite | `.env.vps` |
| **Cloudflare Workers** | D1 | D1 Binding | `.env.workers` + `wrangler.jsonc` |

---

## 🐧 Setup VPS dengan SQLite

### 1. Konfigurasi Environment

```bash
# Copy template environment VPS
cp .env.vps.example .env.vps

# Edit file .env.vps
nano .env.vps
```

**Isi .env.vps untuk SQLite:**
```bash
# Server Configuration
PORT=8787
HOST=0.0.0.0

# Database SQLite (file-based)
DATABASE_URL=file:./dev.db

# API Keys / Secrets (minimal 32 karakter)
HASH_SALT=your_random_salt_here_at_least_32_chars
HASH_SECRET_KEY=your_secret_key_here_at_least_32_chars

# Base URLs for external APIs
BASE_URL_V1=https://ramzapi.vercel.app
BASE_URL_V2=https://dramabos.asia
BASE_URL_V3=https://rebahin-api.vercel.app

# Optional: Dramabox API Token
DRAMABOX_TOKEN=your_token_here

# Environment
NODE_ENV=development
ENVIRONMENT=vps
```

### 2. Switch ke Environment VPS

```bash
./scripts/switch-env.sh vps
```

### 3. Install Dependencies & Setup Database

```bash
# Install dependencies
bun install

# Generate Prisma Client
npx prisma generate

# Push schema ke database SQLite (otomatis membuat file dev.db)
npx prisma db push

# Atau pakai migrate (pilihan)
# npx prisma migrate dev --name init
```

### 4. Verifikasi Database

```bash
# Cek file database sudah ada
ls -la dev.db

# Buka Prisma Studio (opsional)
npx prisma studio
```

### 5. Jalankan Server

```bash
# Development dengan hot reload
bun run dev:vps

# Production
bun run start:vps
```

---

## ☁️ Setup Workers dengan D1

### 1. Buat D1 Database di Cloudflare

```bash
# Login ke wrangler
npx wrangler login

# Buat database D1 baru
npx wrangler d1 create drama-databases

# Output akan menampilkan database_id, simpan untuk step berikutnya
```

### 2. Update wrangler.jsonc

```json
{
  "name": "bun-drama-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true
  },
  "d1_databases": [
    {
      "binding": "drama",
      "database_name": "drama-databases",
      "database_id": "YOUR_DATABASE_ID_HERE"  // Ganti dengan ID dari step 1
    }
  ],
  "vars": {
    "BASE_URL_V1": "https://ramzapi.vercel.app",
    "BASE_URL_V2": "https://dramabos.asia",
    "BASE_URL_V3": "https://rebahin-api.vercel.app"
  }
}
```

### 3. Setup Environment Variables

```bash
# Copy template
cp .env.workers.example .env.workers

# Edit
nano .env.workers
```

**Isi .env.workers:**
```bash
# Cloudflare API Token (untuk deploy)
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# API Keys / Secrets
HASH_SALT=your_random_salt_here_at_least_32_chars
HASH_SECRET_KEY=your_secret_key_here_at_least_32_chars

# Base URLs
BASE_URL_V1=https://ramzapi.vercel.app
BASE_URL_V2=https://dramabos.asia
BASE_URL_V3=https://rebahin-api.vercel.app

# Optional
DRAMABOX_TOKEN=your_token_here

# Environment
NODE_ENV=production
ENVIRONMENT=workers
```

### 4. Switch ke Environment Workers

```bash
./scripts/switch-env.sh workers
```

### 5. Setup Database D1

```bash
# Generate migrations dari schema
npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/0001_init.sql

# Apply migrations ke local D1
npm run db:apply

# Atau apply ke production D1
npm run db:apply:prod
```

**Atau cara manual dengan SQL:**

```bash
# Export schema SQL
npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script > schema.sql

# Apply ke D1 local
npx wrangler d1 execute drama-databases --local --file=./schema.sql

# Apply ke D1 production
npx wrangler d1 execute drama-databases --remote --file=./schema.sql
```

### 6. Deploy Workers

```bash
# Development mode (local)
npm run dev

# Deploy ke production
npm run deploy:workers
```

---

## 🔄 Switching Antara Environment

```bash
# Cek environment saat ini
./scripts/switch-env.sh status

# Switch ke VPS (SQLite)
./scripts/switch-env.sh vps

# Switch ke Workers (D1)
./scripts/switch-env.sh workers
```

---

## 📁 Struktur File Database

```
.
├── dev.db                 # SQLite database (VPS)
├── dev.db-journal         # SQLite journal (auto-generated)
├── migrations/            # D1 migrations (Workers)
│   ├── 0001_init.sql
│   └── ...
├── .env.vps              # VPS config (SQLite)
├── .env.workers          # Workers config (D1)
└── .env -> .env.vps      # Symlink (auto-managed)
```

---

## ⚠️ Perbedaan Penting

### Primary Keys
- **SQLite**: Auto increment integer bisa digunakan
- **D1**: Gunakan `@id @default(cuid())` atau `@id @default(uuid())`

### DateTime
- **SQLite**: Disimpan sebagai INTEGER (Unix timestamp)
- **D1**: Disimpan sebagai TEXT (ISO 8601)

### Raw Queries
- **SQLite (VPS)**: Gunakan Prisma Client
- **D1 (Workers)**: Gunakan `c.env.drama.prepare().all()`

---

## 🧪 Testing Database

### Test VPS (SQLite)
```bash
# Switch ke VPS
./scripts/switch-env.sh vps

# Jalankan test connection
bun -e "
const { testConnection } = require('./src/lib/dbAdapter');
testConnection().then(console.log);
"

# Expected output:
# { success: true, message: 'Prisma connected', type: 'prisma' }
```

### Test Workers (D1)
```bash
# Switch ke Workers
./scripts/switch-env.sh workers

# Jalankan local
npm run dev

# Test di browser/curl
curl http://localhost:8787/health
```

---

## 🛠️ Troubleshooting

### VPS (SQLite) Issues

| Error | Solusi |
|-------|--------|
| `dev.db not found` | Jalankan `npx prisma db push` |
| `Permission denied` | `chmod 666 dev.db` |
| `Database is locked` | Hapus `dev.db-journal` dan restart |
| `Table not found` | Pastikan migration sudah dijalankan |

### Workers (D1) Issues

| Error | Solusi |
|-------|--------|
| `D1 not bound` | Cek `wrangler.jsonc` binding name |
| `Database ID not found` | Verifikasi database_id di wrangler.jsonc |
| `Migration failed` | Cek SQL compatibility dengan D1 |
| `Cannot read env` | Pastikan `c.env.drama` ada di context |

---

## 📊 Perbandingan Fitur

| Fitur | VPS (SQLite) | Workers (D1) |
|-------|--------------|--------------|
| Setup | Mudah (file) | Butuh CF account |
| Scalability | Single node | Global edge |
| Persistence | Local file | Cloudflare edge |
| Backups | Manual | Otomatis CF |
| Cost | Free (self-hosted) | Free tier tersedia |
| Query | Full Prisma | Raw SQL (D1) |

---

## 📝 Catatan Pengembangan

1. **Schema Prisma**: Sama untuk keduanya (SQLite-compatible)
2. **Kode**: Sama, adapter otomatis detect environment
3. **API Response**: Identik, tidak ada perbedaan
4. **Cache**: Universal cache bekerja di keduanya

Selamat coding! 🚀
