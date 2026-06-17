#!/bin/bash
# ============================================
# Deploy to VPS (Production)
# Usage: ./scripts/deploy-vps.sh
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
NC='\033[0m' # No Color

print_header() {
  echo ""
  echo "============================================"
  echo "$1"
  echo "============================================"
  echo ""
}

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

print_header "🚀 Deploying to VPS (Production)"

# Check if .env is linked to vps (cross-platform readlink)
get_real_path() {
  local path="$1"
  if command -v realpath &> /dev/null; then
    realpath "$path" 2>/dev/null || echo ""
  elif command -v readlink &> /dev/null; then
    # BSD readlink (macOS) doesn't support -f, use alternative approach
    if readlink -f "$path" &> /dev/null; then
      readlink -f "$path" 2>/dev/null || echo ""
    else
      # macOS fallback
      local resolved
      resolved=$(readlink "$path" 2>/dev/null || echo "")
      if [ -n "$resolved" ] && [ ! -f "$resolved" ] && [ ! -d "$resolved" ]; then
        # Relative symlink, resolve it
        resolved="$(dirname "$path")/$resolved"
      fi
      echo "$resolved"
    fi
  else
    echo "$path"
  fi
}

current_env=$(get_real_path "$PROJECT_DIR/.env")
if [[ ! "$current_env" == *".env.vps"* ]]; then
  print_warning "Current .env is not linked to .env.vps"
  print_info "Run: ./scripts/switch-env.sh vps"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check Bun is installed
print_step "Checking Bun..."
if ! command -v bun &> /dev/null; then
  print_error "Bun is not installed"
  print_info "Install with: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
print_success "Bun found: $(bun --version)"

# Check if .env.vps exists
if [ ! -f "$PROJECT_DIR/.env.vps" ]; then
  print_error ".env.vps not found!"
  print_info "Run: cp .env.vps.example .env.vps"
  exit 1
fi

# Install dependencies
print_step "Installing dependencies..."
cd "$PROJECT_DIR"
bun install
print_success "Dependencies installed"

# Generate Prisma Client
print_step "Generating Prisma Client..."
npx prisma generate
print_success "Prisma Client generated"

# Run database migrations (optional - ask user)
echo ""
read -p "Run database migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  print_step "Running database migrations..."
  npx prisma migrate deploy
  print_success "Migrations complete"
fi

# Build (TypeScript compilation check)
# print_step "Building application..."
# npm run lint
# if [ $? -ne 0 ]; then
#   print_error "TypeScript compilation failed!"
#   exit 1
# fi
# print_success "Build complete"

echo ""
print_header "🎉 Deployment Preparation Complete!"

echo ""
print_info "To start the server, choose one:"
echo ""
echo "1. Development mode:"
echo "   bun run dev:vps"
echo ""
echo "2. Production mode with PM2:"
echo "   npm install -g pm2"
echo "   pm2 start server.ts --name drama-api"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "3. Using Docker:"
echo "   docker build -t drama-api ."
echo "   docker run -d -p 8787:8787 --env-file .env.vps drama-api"
echo ""
echo "4. Using systemd (manual):"
echo "   sudo cp scripts/drama-api.service /etc/systemd/system/"
echo "   sudo systemctl enable drama-api"
echo "   sudo systemctl start drama-api"
echo ""
echo "5. Using systemd (auto-setup - recommended):"
echo "   sudo ./scripts/setup-systemd.sh"
echo ""

print_success "Deployment files are ready!"
