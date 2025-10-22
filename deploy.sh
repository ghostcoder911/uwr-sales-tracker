#!/bin/bash
# Quick deployment script for UWR Sales Tracker

echo "🚀 Deploying Edit Lead Feature..."
echo ""

# Navigate to web_app directory
cd "$(dirname "$0")"

# Check git status
echo "📊 Checking changes..."
git status
echo ""

# Add all changes
echo "➕ Adding changes..."
git add .
echo ""

# Commit with message
echo "💾 Committing changes..."
git commit -m "Add edit lead feature with modal popup and update functionality"
echo ""

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main
echo ""

echo "✅ Deployment initiated!"
echo "🌐 Render will auto-deploy in 2-5 minutes"
echo "📍 Check your Render dashboard for deployment status"
echo ""
echo "🎉 Done!"

