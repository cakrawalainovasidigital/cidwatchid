# 🚀 Deployment Guide - Bun Drama API

Panduan lengkap deploy Bun Drama API ke VPS (SQLite) atau Cloudflare Workers (D1).

---

## 📋 Daftar Isi

- [Prerequisites](#prerequisites)
- [Opsi 1: Deploy ke VPS (SQLite)](#opsi-1-deploy-ke-vps-sqlite)
- [Opsi 2: Deploy ke Cloudflare Workers (D1)](#opsi-2-deploy-ke-cloudflare-workers-d1)
- [Switching Environment](#switching-environment)
- [Database Management](#database-management)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Untuk VPS (SQLite)
- [Bun](https://bun.sh) >= 1.0.0
- Node.js 18+ (untuk Prisma CLI)
- Git (opsional)

### Untuk Workers (D1)
- [Bun](https://bun.sh) >= 1.0.0
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare Account (gratis)

### Install Bun (jika belum ada)
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # atau ~/.zshrc
```

Verifikasi instalasi:
```bash
bun --version  # Should show 1.x.x
```

---

## Opsi 1: Deploy ke VPS (SQLite)

Cocok untuk:
- Development lokal
- Self-hosted server
- VPS pribadi (DigitalOcean, AWS, Vultr, dll)

### Langkah 1: Clone/Navigate Project

```bash
cd /home/ramzgxz/code/bun-drama-api
```

### Langkah 2: Jalankan Script Setup Otomatis

```bash
./scripts/setup-vps-sqlite.sh
```

Output yang diharapkan:
```
🐧 Setup VPS with SQLite Database

→ Checking Bun installation...
✅ Bun terinstall: 1.3.9

→ Creating environment file...
✅ Created .env.vps

→ Switching to VPS environment...
✅ Linked .env to .env.vps

→ Installing dependencies...
✅ Dependencies installed

→ Generating Prisma Client...
✅ Prisma Client generated

→ Setting up SQLite database...
✅ Database created at dev.db

🎉 Setup Complete!
```

### Langkah 3: Generate Security Keys

```bash
./scripts/generate-env.sh
```

Output:
```
# Generated Environment Variables
HASH_SALT=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
HASH_SECRET_KEY=ZxYvWuTsRqPoNmLkJiHgFeDcBa0987654321
```

**Copy dan paste** nilai tersebut ke `.env.vps`:

```bash
nano .env.vps
```

Ganti baris berikut:
```bash
# SEBELUM
HASH_SALT=change_this_to_random_32_characters
HASH_SECRET_KEY=change_this_to_random_32_chars

# SESUDAH
HASH_SALT=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
HASH_SECRET_KEY=ZxYvWuTsRqPoNmLkJiHgFeDcBa0987654321
```

### Langkah 4: Verifikasi Setup

```bash
# Cek environment
./scripts/switch-env.sh status

# Expected output:
# Current environment: VPS
```

### Langkah 5: Jalankan Server

**Mode Development (dengan hot reload):**
```bash
bun run dev:vps
```

**Mode Production:**
```bash
bun run start:vps
```

### Langkah 6: Test Server

Buka terminal baru dan jalankan:

```bash
# Test health endpoint
curl http://localhost:8787/health

# Response:
# {"message":"OK!","version":"1.0.0","date":"..."}

# Test homepage API
curl http://localhost:8787/api/home

# Test cache stats (VPS only)
curl http://localhost:8787/api/cache/stats
```

Buka browser: http://localhost:8787

### Langkah 7: Setup Auto-Start (Systemd)

Untuk production server yang auto-start saat boot:

```bash
sudo ./scripts/setup-systemd.sh
```

Ikuti prompt untuk memilih user service.

**Manual setup (alternatif):**
```bash
# Edit service file
sudo cp scripts/drama-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable drama-api
sudo systemctl start drama-api

# Cek status
sudo systemctl status drama-api
sudo journalctl -u drama-api -f
```

---

## Opsi 2: Deploy ke Cloudflare Workers (D1)

Cocok untuk:
- Production dengan global edge
- Auto-scaling
- Free tier yang murah

### Langkah 1: Login ke Cloudflare

```bash
npx wrangler login
```

Browser akan terbuka untuk autentikasi.

### Langkah 2: Buat Database D1

```bash
npx wrangler d1 create drama-databases
```

**Simpan output** (contoh):
```
✅ Successfully created DB 'drama-databases' 

[[d1_databases]]
binding = "drama"
database_name = "drama-databases"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Langkah 3: Update Wrangler Config

Edit `wrangler.jsonc`:

```bash
nano wrangler.jsonc
```

Update bagian `d1_databases`:
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
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ],
  "vars": {
    "BASE_URL_V1": "https://ramzapi.vercel.app",
    "BASE_URL_V2": "https://dramabos.asia",
    "BASE_URL_V3": "https://rebahin-api.vercel.app"
  }
}
```

### Langkah 4: Setup Environment Variables

```bash
# Copy template
cp .env.workers.example .env.workers

# Edit
nano .env.workers
```

Isi dengan:
```bash
# API Keys / Secrets (generate dengan: openssl rand -base64 32)
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

### Langkah 5: Switch ke Workers Environment

```bash
./scripts/switch-env.sh workers
```

### Langkah 6: Setup Database D1

#### Opsi A: Menggunakan Prisma Migration (Direkomendasikan)

```bash
# Generate migration SQL
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script \
  --output migrations/0001_init.sql

# Apply ke local D1
npm run db:apply

# Atau apply ke production D1
npm run db:apply:prod
```

#### Opsi B: Manual SQL

```bash
# Export schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > schema.sql

# Apply ke D1 local
npx wrangler d1 execute drama-databases --local --file=./schema.sql

# Apply ke D1 production
npx wrangler d1 execute drama-databases --remote --file=./schema.sql
```

#### Opsi C: Menggunakan Wrangler dengan File SQL

Jika ada file `schema.sql` dari Prisma:

```bash
# Create schema SQL dari Prisma
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > schema.sql

# Execute ke D1
npx wrangler d1 execute drama-databases --local --file=./schema.sql
```

### Langkah 7: Deploy

**Development (local):**
```bash
npm run dev
```

**Deploy ke Production:**
```bash
npm run deploy:workers
```

Output:
```
✨ Successfully published script to:
https://bun-drama-api.your-account.workers.dev
```

### Langkah 8: Verifikasi Deployment

```bash
# Test health endpoint
curl https://bun-drama-api.your-account.workers.dev/health

# Test API
curl https://bun-drama-api.your-account.workers.dev/api/home
```

---

## Switching Environment

### Cek Environment Saat Ini
```bash
./scripts/switch-env.sh status
```

Output:
```
Environment Status
ℹ️  Current .env source: /home/user/code/bun-drama-api/.env.vps
✅ Current environment: VPS
```

### Switch ke VPS (SQLite)
```bash
./scripts/switch-env.sh vps
```

### Switch ke Workers (D1)
```bash
./scripts/switch-env.sh workers
```

---

## Database Management

### VPS (SQLite)

**Lokasi database:**
```
./dev.db          # Database file
./dev.db-journal  # Journal file (auto-generated)
```

**Backup database:**
```bash
# Copy file
cp dev.db dev.db.backup.$(date +%Y%m%d)

# Atau export ke SQL
sqlite3 dev.db ".dump" > backup.sql
```

**Restore database:**
```bash
# Restore dari backup
cp dev.db.backup.20240225 dev.db

# Atau dari SQL
sqlite3 dev.db < backup.sql
```

**Buka Prisma Studio:**
```bash
npx prisma studio
```

**Reset database:**
```bash
# Hapus dan buat ulang
rm dev.db dev.db-journal
npx prisma db push
```

**Migrate database:**
```bash
# Development
npx prisma migrate dev --name migration_name

# Production
npx prisma migrate deploy
```

### Workers (D1)

**List database:**
```bash
npx wrangler d1 list
```

**Execute SQL:**
```bash
# Local
npx wrangler d1 execute drama-databases --local --command="SELECT * FROM users"

# Production
npx wrangler d1 execute drama-databases --remote --command="SELECT * FROM users"
```

**Export database:**
```bash
npx wrangler d1 export drama-databases --remote --output=./backup.sql
```

**Backup otomatis:**
D1 sudah memiliki backup otomatis dari Cloudflare.

---

## Troubleshooting

### VPS (SQLite) Issues

#### Error: `dev.db not found`
```bash
# Solusi: Buat database
npx prisma db push
```

#### Error: `Permission denied`
```bash
# Solusi: Fix permission
chmod 666 dev.db
chmod 777 .
```

#### Error: `Database is locked`
```bash
# Solusi: Hapus journal dan restart
rm dev.db-journal
pkill -f "bun server.ts"
bun run dev:vps
```

#### Error: `Table not found`
```bash
# Solusi: Sync schema
npx prisma db push --accept-data-loss
```

#### Error: `Port already in use`
```bash
# Cek port
lsof -ti:8787

# Kill process
lsof -ti:8787 | xargs kill -9

# Atau ganti port di .env.vps
PORT=3000
```

### Workers (D1) Issues

#### Error: `D1 not bound`
```bash
# Solusi: Cek wrangler.jsonc
# Pastikan binding name sesuai dengan yang dipakai di kode
```

#### Error: `Database ID not found`
```bash
# Solusi: Verifikasi database_id
npx wrangler d1 list
# Update wrangler.jsonc dengan ID yang benar
```

#### Error: `Migration failed`
```bash
# Solusi: Check SQL compatibility
# D1 tidak support semua fitur SQLite
# Cek: https://developers.cloudflare.com/d1/platform/limits/
```

#### Error: `Cannot read env`
```bash
# Solusi: Pastikan variabel binding benar
# Cek: const db = c.env.drama
```

### Common Issues

#### Error: `bun: command not found`
```bash
# Solusi: Add bun ke PATH
export PATH="$HOME/.bun/bin:$PATH"
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
```

#### Error: `prisma: command not found`
```bash
# Solusi: Install prisma global atau pakai npx
npm install -g prisma
# atau
npx prisma
```

#### Error: `NODE_ENV is not set`
```bash
# Solusi: Export environment variable
export NODE_ENV=development
```

---

## Tips & Best Practices

### 1. Environment Variables

**Selalu generate random keys untuk production:**
```bash
openssl rand -base64 32
```

**Jangan commit file environment:**
```bash
# Pastikan di .gitignore
.env
.env.vps
.env.workers
.env.local
dev.db
dev.db-journal
```

### 2. Database

**VPS (SQLite):**
- Backup secara rutin: `cp dev.db dev.db.backup.$(date +%Y%m%d)`
- Untuk production dengan traffic tinggi, pertimbangkan PostgreSQL

**Workers (D1):**
- Backup otomatis oleh Cloudflare
- Gunakan D1 untuk read-heavy workloads

### 3. Performance

**Cache Configuration:**
```typescript
// Short cache untuk data yang sering berubah
app.get('/new-release', cacheShort, handler);

// Long cache untuk data yang jarang berubah
app.get('/genre', cacheDay, handler);
```

**Rate Limiting:**
- Workers: Otomatis dengan Cache API
- VPS: In-memory Map (reset saat restart)

### 4. Monitoring

**VPS:**
```bash
# Monitor logs
pm2 logs drama-api

# Atau
journalctl -u drama-api -f

# Monitor cache
curl http://localhost:8787/api/cache/stats
```

**Workers:**
```bash
# View logs
npx wrangler tail
```

### 5. Security

- Ganti default HASH_SALT dan HASH_SECRET_KEY
- Gunakan HTTPS di production
- Batasi CORS origin di `src/index.ts`
- Enable rate limiting untuk public API

---

## Quick Reference

### Commands Cheat Sheet

```bash
# Environment
./scripts/switch-env.sh status    # Check current
./scripts/switch-env.sh vps       # Switch to VPS
./scripts/switch-env.sh workers   # Switch to Workers

# VPS
bun run dev:vps                   # Development
bun run start:vps                 # Production
./scripts/setup-vps-sqlite.sh     # Auto setup

# Workers
npm run dev                       # Local dev
npm run deploy:workers            # Deploy

# Database VPS
npx prisma db push                # Sync schema
npx prisma migrate dev            # Create migration
npx prisma studio                 # GUI editor

# Database Workers
npm run db:apply                  # Local D1
npm run db:apply:prod             # Production D1

# Utilities
./scripts/generate-env.sh         # Generate random keys
./scripts/setup-systemd.sh        # Setup auto-start
```

---

## Need Help?

- 📖 [Prisma Documentation](https://www.prisma.io/docs)
- ☁️ [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- 🍞 [Bun Documentation](https://bun.sh/docs)
- 🔥 [Hono Framework](https://hono.dev)

---

**Selamat deploy!** 🚀
