# ⚡ Quick Start Guide

Panduan cepat menjalankan Bun Drama API dalam 5 menit.

---

## 🎯 Pilih Environment

| Environment | Database | Cocok Untuk |
|-------------|----------|-------------|
| **VPS** | SQLite | Development lokal, VPS pribadi |
| **Workers** | D1 | Production, global edge |

---

## 🐧 Opsi 1: VPS (SQLite) - 3 Menit

### 1. Setup (1 menit)
```bash
cd /home/ramzgxz/code/bun-drama-api
./scripts/setup-vps-sqlite.sh
```

### 2. Generate Keys (30 detik)
```bash
./scripts/generate-env.sh
# Copy output ke .env.vps
nano .env.vps
```

### 3. Jalankan (1 menit)
```bash
bun run dev:vps
```

### 4. Test (30 detik)
```bash
curl http://localhost:8787/health
```

✅ **Done!** Buka http://localhost:8787

---

## ☁️ Opsi 2: Workers (D1) - 5 Menit

### 1. Setup Database (2 menit)
```bash
npx wrangler login
npx wrangler d1 create drama-databases
# Copy database_id
```

### 2. Update Config (1 menit)
```bash
nano wrangler.jsonc
# Paste database_id
```

### 3. Deploy (2 menit)
```bash
./scripts/switch-env.sh workers
npm run db:apply:prod
npm run deploy:workers
```

✅ **Done!** API live di URL Workers Anda

---

## 📚 Dokumentasi Lengkap

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Panduan lengkap step-by-step
- **[DUAL_DATABASE_SETUP.md](DUAL_DATABASE_SETUP.md)** - Konfigurasi database dual
- **[AGENTS.md](AGENTS.md)** - Informasi project untuk developer

---

## 🔧 Perintah Berguna

```bash
# Switch environment
./scripts/switch-env.sh vps      # Ke VPS
./scripts/switch-env.sh workers  # Ke Workers
./scripts/switch-env.sh status   # Cek status

# Database VPS
npx prisma studio                # GUI database
npx prisma db push               # Sync schema

# Database Workers
npm run db:apply                 # Local D1
npm run db:apply:prod            # Production D1

# Development
bun run dev:vps                  # VPS dev mode
npm run dev                      # Workers dev mode

# Deploy
npm run deploy:workers           # Deploy ke Workers
./scripts/deploy-vps.sh          # Setup VPS production
```

---

## ❓ Troubleshooting Umum

| Problem | Solusi |
|---------|--------|
| `bun not found` | `curl -fsSL https://bun.sh/install \| bash` |
| `dev.db not found` | `npx prisma db push` |
| `Port already in use` | `lsof -ti:8787 \| xargs kill -9` |
| `D1 not bound` | Cek `database_id` di `wrangler.jsonc` |

Lihat [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) untuk detail lengkap.

---

**Ready to code!** 🚀
