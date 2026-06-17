#!/bin/bash
# ============================================
# Setup VPS with SQLite Database
# Auto-configured for local Linux development
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
  echo -e "${CYAN}→ $1${NC}"
}

print_header() {
  echo ""
  echo "============================================"
  echo "$1"
  echo "============================================"
  echo ""
}

print_header "🐧 Setup VPS with SQLite Database"

# Check Bun
print_step "Checking Bun installation..."
if ! command -v bun &> /dev/null; then
  print_error "Bun tidak terinstall!"
  print_info "Install dengan: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
print_success "Bun terinstall: $(bun --version)"

# Check Node (for Prisma)
print_step "Checking Node.js..."
if ! command -v node &> /dev/null; then
  print_warning "Node.js tidak terinstall (dibutuhkan untuk Prisma)"
  print_info "Install Node.js 18+ dari https://nodejs.org"
fi

cd "$PROJECT_DIR"

# Create .env.vps if not exists
print_step "Creating environment file..."
if [ ! -f "$PROJECT_DIR/.env.vps" ]; then
  cat > "$PROJECT_DIR/.env.vps" << 'EOF'
# ============================================
# VPS ENVIRONMENT - SQLite Configuration
# ============================================

# Server Configuration
PORT=8787
HOST=0.0.0.0

# Database SQLite (file-based, auto-created)
DATABASE_URL=file:./dev.db

# API Keys / Secrets (GANTI DENGAN VALUE RANDOM!)
# Minimal 32 karakter, gunakan: openssl rand -base64 32
HASH_SALT=change_this_to_random_32_characters
HASH_SECRET_KEY=change_this_to_random_32_chars

# Base URLs for external APIs
BASE_URL_V1=https://ramzapi.vercel.app
BASE_URL_V2=https://dramabos.asia
BASE_URL_V3=https://rebahin-api.vercel.app

# Optional: Dramabox API Token
DRAMABOX_TOKEN=

# Environment
NODE_ENV=development
ENVIRONMENT=vps
EOF
  print_success "Created .env.vps"
  print_warning "⚠️  IMPORTANT: Edit .env.vps and change HASH_SALT and HASH_SECRET_KEY!"
else
  print_info ".env.vps sudah ada, menggunakan file existing"
fi

# Switch to VPS environment
print_step "Switching to VPS environment..."
"$SCRIPT_DIR/switch-env.sh" vps
print_success "Environment switched to VPS"

# Install dependencies
print_step "Installing dependencies..."
bun install
print_success "Dependencies installed"

# Generate Prisma Client
print_step "Generating Prisma Client..."
bunx --bun prisma generate
print_success "Prisma Client generated"

# Setup database
print_step "Setting up SQLite database..."
if [ ! -f "$PROJECT_DIR/dev.db" ]; then
  print_info "Creating new SQLite database..."
  bunx --bun prisma db push --accept-data-loss
  print_success "Database created at dev.db"
else
  print_info "Database dev.db sudah ada, melakukan sync schema..."
  bunx --bun prisma db push --accept-data-loss
  print_success "Database schema synced"
fi

# Create .gitignore entry
if [ -f "$PROJECT_DIR/.gitignore" ]; then
  if ! grep -q "dev.db" "$PROJECT_DIR/.gitignore"; then
    echo "" >> "$PROJECT_DIR/.gitignore"
    echo "# SQLite database files" >> "$PROJECT_DIR/.gitignore"
    echo "dev.db" >> "$PROJECT_DIR/.gitignore"
    echo "dev.db-journal" >> "$PROJECT_DIR/.gitignore"
    print_info "Added dev.db to .gitignore"
  fi
fi

echo ""
print_header "🎉 Setup Complete!"

echo ""
print_info "Langkah selanjutnya:"
echo ""
echo "1. Edit konfigurasi (IMPORTANT!):"
echo "   nano .env.vps"
echo ""
echo "   Ganti HASH_SALT dan HASH_SECRET_KEY dengan random string (32+ karakter)"
echo "   Generate dengan: openssl rand -base64 32"
echo ""
echo "2. Jalankan server (pilih salah satu):"
echo ""
echo "   Development (hot reload):"
echo "   bun run dev:vps"
echo ""
echo "   Production:"
echo "   bun run start:vps"
echo ""
echo "3. Test server:"
echo "   curl http://localhost:8787/health"
echo "   curl http://localhost:8787/api/home"
echo ""
echo "4. Setup systemd (auto-start):"
echo "   sudo ./scripts/setup-systemd.sh"
echo ""

# Check if hash values are still default
if grep -q "change_this_to_random" "$PROJECT_DIR/.env.vps"; then
  print_warning "⚠️  PERINGATAN: HASH_SALT dan HASH_SECRET_KEY masih default!"
  print_warning "   Edit .env.vps dan ganti dengan nilai random sebelum production!"
  echo ""
fi

print_success "Setup VPS with SQLite selesai!"
