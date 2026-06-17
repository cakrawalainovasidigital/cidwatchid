#!/bin/bash
# ============================================
# Deploy to Cloudflare Workers
# Usage: ./scripts/deploy-workers.sh
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

print_header "🚀 Deploying to Cloudflare Workers"

# Check if .env is linked to workers
current_env=$(readlink -f "$PROJECT_DIR/.env" 2>/dev/null || echo "")
if [[ ! "$current_env" == *".env.workers"* ]]; then
  print_warning "Current .env is not linked to .env.workers"
  print_info "Run: ./scripts/switch-env.sh workers"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check required files
print_step "Checking required files..."

if [ ! -f "$PROJECT_DIR/wrangler.jsonc" ] && [ ! -f "$PROJECT_DIR/wrangler.toml" ]; then
  print_error "wrangler.jsonc or wrangler.toml not found!"
  exit 1
fi

if [ ! -f "$PROJECT_DIR/.env.workers" ]; then
  print_error ".env.workers not found!"
  print_info "Run: cp .env.workers.example .env.workers"
  exit 1
fi

print_success "Required files found"

# Check if wrangler is installed
print_step "Checking wrangler CLI..."
if ! command -v wrangler &> /dev/null; then
  print_error "wrangler is not installed"
  print_info "Install with: npm install -g wrangler"
  exit 1
fi
print_success "wrangler CLI found"

# Generate Prisma Client for Workers
print_step "Generating Prisma Client for Workers..."
cd "$PROJECT_DIR"
npx prisma generate
print_success "Prisma Client generated"

# Deploy
print_step "Deploying to Cloudflare Workers..."
echo ""

if [ -f "$PROJECT_DIR/wrangler.jsonc" ]; then
  npx wrangler deploy --config wrangler.jsonc
else
  npx wrangler deploy
fi

echo ""
print_success "Deployment complete!"

echo ""
print_info "Your API is now live at:"
echo "  - https://your-worker.your-subdomain.workers.dev"
echo "  - https://your-worker.your-subdomain.workers.dev/health"
echo ""
print_info "To view logs: npx wrangler tail"
print_info "To rollback: npx wrangler rollback"
echo ""
