#!/bin/bash
# ============================================
# Generate Secure Environment Variables
# ============================================

# Generate random salts
HASH_SALT=$(openssl rand -base64 32 | tr -d '\n')
HASH_SECRET=$(openssl rand -base64 32 | tr -d '\n')

echo "# Generated Environment Variables"
echo "# Copy these to your .env.vps or .env.workers file"
echo ""
echo "HASH_SALT=$HASH_SALT"
echo "HASH_SECRET_KEY=$HASH_SECRET"
