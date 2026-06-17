#!/bin/bash
# ============================================
# Environment Switcher Script
# Usage: ./scripts/switch-env.sh [workers|vps]
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_TYPE="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Show help
if [ -z "$ENV_TYPE" ] || [ "$ENV_TYPE" == "--help" ] || [ "$ENV_TYPE" == "-h" ]; then
  echo ""
  echo "Usage: ./scripts/switch-env.sh [workers|vps|status]"
  echo ""
  echo "Commands:"
  echo "  workers  - Switch to Cloudflare Workers environment"
  echo "  vps      - Switch to VPS (Node.js/Bun) environment"
  echo "  status   - Show current environment status"
  echo ""
  exit 0
fi

# Check current status
if [ "$ENV_TYPE" == "status" ]; then
  print_header "Environment Status"
  
  if [ -f "$PROJECT_DIR/.env" ]; then
    ENV_SOURCE=$(readlink -f "$PROJECT_DIR/.env" 2>/dev/null || echo "$PROJECT_DIR/.env")
    print_info "Current .env source: $ENV_SOURCE"
    
    if [ -L "$PROJECT_DIR/.env" ]; then
      if [[ "$ENV_SOURCE" == *".env.workers"* ]]; then
        print_success "Current environment: WORKERS"
      elif [[ "$ENV_SOURCE" == *".env.vps"* ]]; then
        print_success "Current environment: VPS"
      else
        print_warning "Current environment: UNKNOWN"
      fi
    else
      print_warning ".env is a regular file (not a symlink)"
    fi
  else
    print_error ".env file not found"
    print_info "Run: cp .env.workers.example .env.workers && cp .env.vps.example .env.vps"
  fi
  
  echo ""
  exit 0
fi

# Validate environment type
if [ "$ENV_TYPE" != "workers" ] && [ "$ENV_TYPE" != "vps" ]; then
  print_error "Invalid environment type: $ENV_TYPE"
  print_info "Use 'workers' or 'vps'"
  exit 1
fi

print_header "Switching to $ENV_TYPE environment"

# Check if example files exist
if [ ! -f "$PROJECT_DIR/.env.workers.example" ]; then
  print_error ".env.workers.example not found!"
  exit 1
fi

if [ ! -f "$PROJECT_DIR/.env.vps.example" ]; then
  print_error ".env.vps.example not found!"
  exit 1
fi

# Create env files from examples if they don't exist
if [ ! -f "$PROJECT_DIR/.env.workers" ]; then
  print_info "Creating .env.workers from example..."
  cp "$PROJECT_DIR/.env.workers.example" "$PROJECT_DIR/.env.workers"
  print_warning "Please edit .env.workers with your actual values!"
fi

if [ ! -f "$PROJECT_DIR/.env.vps" ]; then
  print_info "Creating .env.vps from example..."
  cp "$PROJECT_DIR/.env.vps.example" "$PROJECT_DIR/.env.vps"
  print_warning "Please edit .env.vps with your actual values!"
fi

# Backup existing .env if it's a regular file
if [ -f "$PROJECT_DIR/.env" ] && [ ! -L "$PROJECT_DIR/.env" ]; then
  BACKUP_NAME=".env.backup.$(date +%Y%m%d_%H%M%S)"
  print_info "Backing up existing .env to $BACKUP_NAME"
  mv "$PROJECT_DIR/.env" "$PROJECT_DIR/$BACKUP_NAME"
fi

# Remove existing symlink if exists
if [ -L "$PROJECT_DIR/.env" ]; then
  rm "$PROJECT_DIR/.env"
fi

# Create symlink to appropriate env file
if [ "$ENV_TYPE" == "workers" ]; then
  ln -s "$PROJECT_DIR/.env.workers" "$PROJECT_DIR/.env"
  print_success "Linked .env to .env.workers"
  
  echo ""
  print_info "Next steps for Workers:"
  echo "  1. Edit .env.workers with your Cloudflare credentials"
  echo "  2. Run: npm run deploy:workers"
  echo ""
  
elif [ "$ENV_TYPE" == "vps" ]; then
  ln -s "$PROJECT_DIR/.env.vps" "$PROJECT_DIR/.env"
  print_success "Linked .env to .env.vps"
  
  echo ""
  print_info "Next steps for VPS:"
  echo "  1. Edit .env.vps with your database credentials"
  echo "  2. Run: npm run db:generate (generate Prisma client)"
  echo "  3. Run: npm run db:migrate (if using PostgreSQL/MySQL)"
  echo "  4. Run: npm run start:vps"
  echo ""
fi

print_success "Environment switched to: $ENV_TYPE"
echo ""
