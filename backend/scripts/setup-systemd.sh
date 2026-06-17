#!/bin/bash
# ============================================
# Setup systemd service for Drama API
# Usage: ./scripts/setup-systemd.sh
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

echo ""
echo "============================================"
echo "🔧 Setting up systemd service for Drama API"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  print_error "Please run as root or with sudo"
  print_info "Usage: sudo ./scripts/setup-systemd.sh"
  exit 1
fi

# Detect current user (the one who ran sudo)
if [ -n "$SUDO_USER" ]; then
  CURRENT_USER="$SUDO_USER"
else
  CURRENT_USER=$(whoami)
fi
print_info "Detected user: $CURRENT_USER"

# Get project directory
PROJECT_PATH=$(pwd)
print_info "Project path: $PROJECT_PATH"

# Find bun path
BUN_PATH=$(which bun || echo "")
if [ -z "$BUN_PATH" ]; then
  # Try common paths
  if [ -f "/root/.bun/bin/bun" ]; then
    BUN_PATH="/root/.bun/bin/bun"
  elif [ -f "/home/$CURRENT_USER/.bun/bin/bun" ]; then
    BUN_PATH="/home/$CURRENT_USER/.bun/bin/bun"
  elif [ -f "/usr/local/bin/bun" ]; then
    BUN_PATH="/usr/local/bin/bun"
  fi
fi

if [ -z "$BUN_PATH" ]; then
  print_error "Bun not found! Please install bun first."
  print_info "Install with: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
print_info "Bun path: $BUN_PATH"

# Check if .env exists
if [ ! -f "$PROJECT_PATH/.env" ]; then
  print_warning ".env file not found at $PROJECT_PATH/.env"
  print_info "Make sure to run: ./scripts/switch-env.sh vps"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Determine user for service
print_step "Configuring service user..."
echo ""
echo "Select service user:"
echo "  1) $CURRENT_USER (current user)"
echo "  2) www-data (web server user)"
echo "  3) Custom user"
echo ""
read -p "Choice [1-3]: " choice

case $choice in
  1)
    SERVICE_USER="$CURRENT_USER"
    ;;
  2)
    SERVICE_USER="www-data"
    if ! id -u www-data &>/dev/null; then
      print_warning "www-data user does not exist. Creating..."
      useradd -r -s /bin/false www-data || true
    fi
    ;;
  3)
    read -p "Enter username: " SERVICE_USER
    if ! id -u "$SERVICE_USER" &>/dev/null; then
      print_error "User $SERVICE_USER does not exist!"
      exit 1
    fi
    ;;
  *)
    print_error "Invalid choice"
    exit 1
    ;;
esac

print_info "Service will run as user: $SERVICE_USER"

# Create service file
SERVICE_FILE="/etc/systemd/system/drama-api.service"
print_step "Creating systemd service file..."

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Drama API Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$PROJECT_PATH
Environment="NODE_ENV=production"
Environment="PORT=8787"
Environment="HOST=0.0.0.0"
EnvironmentFile=$PROJECT_PATH/.env
ExecStart=$BUN_PATH $PROJECT_PATH/server.ts
Restart=on-failure
RestartSec=10
StartLimitInterval=60s
StartLimitBurst=3
TimeoutStopSec=30
KillSignal=SIGINT
StandardOutput=journal
StandardError=journal
SyslogIdentifier=drama-api

[Install]
WantedBy=multi-user.target
EOF

print_success "Service file created at $SERVICE_FILE"

# Set permissions
print_step "Setting permissions..."
chown -R "$SERVICE_USER:$SERVICE_USER" "$PROJECT_PATH" || true
chmod 644 "$SERVICE_FILE"

# Reload systemd
print_step "Reloading systemd..."
systemctl daemon-reload

# Enable service
print_step "Enabling service..."
systemctl enable drama-api.service

echo ""
echo "============================================"
print_success "Systemd service setup complete!"
echo "============================================"
echo ""
print_info "Service commands:"
echo "  sudo systemctl start drama-api    # Start service"
echo "  sudo systemctl stop drama-api     # Stop service"
echo "  sudo systemctl restart drama-api  # Restart service"
echo "  sudo systemctl status drama-api   # Check status"
echo "  sudo journalctl -u drama-api -f   # View logs"
echo ""
print_info "Start the service now?"
read -p "Start service? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  systemctl start drama-api
  sleep 2
  systemctl status drama-api --no-pager
fi
