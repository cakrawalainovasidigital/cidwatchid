# 🚀 Multi-Environment Deployment Guide

Drama API mendukung deployment ke **Cloudflare Workers** dan **VPS** (Node.js/Bun) dengan konfigurasi yang sama.

## 📁 Struktur File

```
.
├── .env.workers.example      # Template env untuk Workers
├── .env.vps.example          # Template env untuk VPS
├── .env                      # Symlink ke salah satu (.env.workers atau .env.vps)
├── server.ts                 # Entry point VPS (Bun/Node.js)
├── src/index.ts              # Entry point Hono (universal)
├── scripts/
│   ├── switch-env.sh         # Switch antara Workers/VPS
│   ├── deploy-workers.sh     # Deploy ke Workers
│   ├── deploy-vps.sh         # Setup VPS deployment
│   └── drama-api.service     # Systemd service file
├── Dockerfile                # Docker image
└── docker-compose.yml        # Docker Compose setup
```

## 🔧 Setup Awal

### 1. Copy Environment Templates

```bash
# Copy template untuk kedua environment
cp .env.workers.example .env.workers
cp .env.vps.example .env.vps
```

### 2. Edit Environment Files

Edit `.env.workers` dan `.env.vps` dengan konfigurasi Anda.

## 🌩️ Deploy ke Cloudflare Workers

### Switch ke Workers Environment

```bash
# Ubah symlink .env ke .env.workers
./scripts/switch-env.sh workers

# Atau dengan npm
npm run env:workers
```

### Deploy

```bash
# Deploy ke Workers
npm run deploy:workers

# Atau langsung
./scripts/deploy-workers.sh
```

### Commands untuk Workers

```bash
npm run dev              # Development mode (local)
npm run dev:remote       # Development mode (remote)
npm run deploy           # Deploy ke production
npm run workers:logs     # Lihat logs real-time
npm run workers:rollback # Rollback deployment
```

## 🖥️ Deploy ke VPS

### Switch ke VPS Environment

```bash
# Ubah symlink .env ke .env.vps
./scripts/switch-env.sh vps

# Atau dengan npm
npm run env:vps
```

### Setup Database (PostgreSQL/MySQL/SQLite)

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations (untuk PostgreSQL/MySQL)
npm run db:migrate:prod

# Atau push schema (untuk development)
npm run db:push
```

### Run Server

```bash
# Development dengan hot reload
npm run dev:vps

# Production
npm run start:vps
```

### Deployment ke VPS Production

#### Option 1: PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start dengan PM2
pm2 start server.ts --name drama-api

# Save konfigurasi
pm2 save
pm2 startup

# Commands
pm2 status               # Lihat status
pm2 logs drama-api       # Lihat logs
pm2 restart drama-api    # Restart
pm2 stop drama-api       # Stop
```

#### Option 2: Docker

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# Atau dengan Docker Compose
npm run docker:compose
```

#### Option 3: Systemd

```bash
# Copy service file
sudo cp scripts/drama-api.service /etc/systemd/system/

# Edit path di service file jika perlu
sudo nano /etc/systemd/system/drama-api.service

# Enable dan start
sudo systemctl daemon-reload
sudo systemctl enable drama-api
sudo systemctl start drama-api

# Commands
sudo systemctl status drama-api
sudo systemctl restart drama-api
sudo journalctl -u drama-api -f
```

## 🔄 Switching Between Environments

```bash
# Cek environment saat ini
./scripts/switch-env.sh status
npm run env:status

# Switch ke Workers
./scripts/switch-env.sh workers
npm run env:workers

# Switch ke VPS
./scripts/switch-env.sh vps
npm run env:vps
```

## 📊 Perbedaan Workers vs VPS

| Fitur | Cloudflare Workers | VPS (Node.js/Bun) |
|-------|-------------------|-------------------|
| **Server** | Edge (global) | Single server |
| **HTTP Proxy** | ❌ Tidak support | ✅ Support |
| **Database** | D1 (SQLite) | PostgreSQL/MySQL/SQLite |
| **Cold Start** | ~0ms | ~100-500ms |
| **Cost** | Free tier tersedia | Bayar server |
| **Scaling** | Otomatis | Manual/PM2 |
| **Proxy Support** | External API only | HTTP/SOCKS proxy |

## 🛠️ Universal Adapter

### Environment Adapter (`src/lib/envAdapter.ts`)

```typescript
import { getEnv, isWorkers, isVPS } from './lib/envAdapter';

// Get environment variable (works on both)
const dbUrl = getEnv(c, 'DATABASE_URL');

// Check environment
if (isWorkers()) {
  // Workers-specific code
}

if (isVPS()) {
  // VPS-specific code
}
```

### Database Adapter (`src/lib/dbAdapter.ts`)

```typescript
import { getDB, executeQuery } from './lib/dbAdapter';

// Get database client (D1 atau Prisma)
const db = getDB(c);

// Execute query (universal)
const result = await executeQuery(c, 'SELECT * FROM users');
```

## 🧪 Testing

### Test di Workers

```bash
npm run env:workers
npm run dev

curl http://localhost:8787/health
curl http://localhost:8787/environment
```

### Test di VPS

```bash
npm run env:vps
npm run dev:vps

curl http://localhost:8787/health
curl http://localhost:8787/environment
```

## 🐛 Troubleshooting

### Workers: Deployment Failed

```bash
# Check wrangler login
npx wrangler login

# Check config
npx wrangler config

# View logs
npx wrangler tail
```

### VPS: Database Connection Failed

```bash
# Test database connection
npx prisma db pull

# Check environment
./scripts/switch-env.sh status

# Validate env vars
cat .env.vps | grep DATABASE_URL
```

### VPS: Port Already in Use

```bash
# Find process using port
lsof -i :8787

# Kill process
kill -9 <PID>

# Or change port in .env.vps
PORT=8788
```

## 📝 Catatan Penting

1. **HTTP Proxy** hanya berfungsi di VPS, tidak di Workers
2. **Database D1** hanya untuk Workers, VPS pakai PostgreSQL/MySQL/SQLite
3. **Environment** selalu dicek otomatis via `envAdapter.ts`
4. **.env file** adalah symlink, jangan edit langsung, pakai `switch-env.sh`

## 🆘 Need Help?

```bash
# Environment status
npm run env:status

# Health check
curl http://localhost:8787/health

# Environment info
curl http://localhost:8787/environment
```
