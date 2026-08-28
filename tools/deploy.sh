#!/bin/bash

# Automated deployment script for Brief Delights landing page
# This script handles the full deployment cycle avoiding iCloud git issues

set -e  # Exit on error

echo "🚀 Brief Delights - Automated Deployment"
echo "========================================"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICLOUD_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_REPO="/tmp/brief-delights-deploy"
GITHUB_REPO="https://github.com/LinusInnovator/brief-delights.git"

# Step 1: Clone/Update clean repository
echo "[1/5] Setting up clean repository..."
if [ -d "$TMP_REPO" ]; then
    echo "  → Repository exists, pulling latest changes..."
    cd "$TMP_REPO"
    git fetch origin
    git reset --hard origin/main
else
    echo "  → Cloning fresh repository..."
    git clone "$GITHUB_REPO" "$TMP_REPO"
    cd "$TMP_REPO"
fi
echo "  ✅ Clean repository ready"
echo ""

# Step 2: Copy changed files from iCloud to clean repo
echo "[2/5] Syncing files from iCloud directory..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='public/newsletters' --exclude='.tmp' \
    "$ICLOUD_DIR/landing/" "$TMP_REPO/landing/"
rsync -av --exclude='.git' --exclude='.tmp' --exclude='__pycache__' \
    "$ICLOUD_DIR/execution/" "$TMP_REPO/execution/"
rsync -av "$ICLOUD_DIR/.github/" "$TMP_REPO/.github/"
rsync -av "$ICLOUD_DIR/requirements.txt" "$TMP_REPO/"
rsync -av "$ICLOUD_DIR/README.md" "$TMP_REPO/" 2>/dev/null || true

# Pipeline-critical root files: templates, configs, tools
rsync -av "$ICLOUD_DIR/newsletter_template.html" "$TMP_REPO/"
rsync -av "$ICLOUD_DIR/newsletter_teaser_weekly.html" "$TMP_REPO/"
rsync -av "$ICLOUD_DIR/segments_config.json" "$TMP_REPO/"
rsync -av "$ICLOUD_DIR/feeds_config.json" "$TMP_REPO/"
rsync -av "$ICLOUD_DIR/subscribers.json" "$TMP_REPO/"
rsync -av --exclude='__pycache__' "$ICLOUD_DIR/feeds_config/" "$TMP_REPO/feeds_config/" 2>/dev/null || true
rsync -av "$ICLOUD_DIR/tools/" "$TMP_REPO/tools/" 2>/dev/null || true
echo "  ✅ Files synced"
echo ""

# Step 3: Install dependencies and test build
echo "[3/5] Installing dependencies and testing build..."
cd "$TMP_REPO/landing"

# Install dependencies if node_modules doesn't exist or is outdated
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "  → Installing npm dependencies..."
    npm install --silent
    echo "  ✅ Dependencies installed"
fi

echo "  → Testing build..."
if npm run build; then
    echo "  ✅ Build successful!"
else
    echo "  ❌ Build failed!"
    echo ""
    echo "Fix the build errors above before deploying."
    exit 1
fi
echo ""

# Step 4: Commit and push changes
echo "[4/5] Committing and pushing changes..."
cd "$TMP_REPO"
git add -A

if git diff --staged --quiet; then
    echo "  ℹ️  No changes to commit"
else
    COMMIT_MSG="${1:-feat: Update landing page components}"
    git commit -m "$COMMIT_MSG"
    echo "  ✅ Changes committed: $COMMIT_MSG"
    
    git push origin main
    echo "  ✅ Pushed to GitHub"
fi
echo ""

# Step 5: Monitor Netlify deployment
echo "[5/5] Deployment Status"
echo "  📡 Changes pushed to GitHub"
echo "  🔄 Netlify auto-deploy triggered"
echo ""
echo "  Monitor deployment at:"
echo "  https://github.com/LinusInnovator/brief-delights/actions"
echo ""
echo "  Live site will update in ~3 minutes:"
echo "  https://brief.delights.pro"
echo ""
echo "✅ Deployment initiated successfully!"
