#!/bin/bash

# Amplifier Lights - Render Deployment Script
# This script helps prepare your application for Render deployment

echo "🚀 Preparing Amplifier Lights for Render deployment..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if all required files exist
echo "📋 Checking required files..."

required_files=(
    "package.json"
    "src/index.js"
    "src/app.js"
    "knexfile.js"
    "render.yaml"
    "Dockerfile.prod"
    "healthcheck.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - Missing!"
        missing_files=true
    fi
done

if [ "$missing_files" = true ]; then
    echo "❌ Some required files are missing. Please create them first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check if database migrations exist
if [ ! -d "database/migrations" ]; then
    echo "⚠️  No database migrations found. Consider creating some:"
    echo "   npm run migrate:make -- create_initial_tables"
fi

# Check if seeds exist
if [ ! -d "database/seeds" ]; then
    echo "⚠️  No database seeds found. Consider creating some:"
    echo "   npm run seed:make -- initial_data"
fi

# Git status check
echo "🔍 Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Consider committing them:"
    echo "   git add ."
    echo "   git commit -m 'Prepare for Render deployment'"
else
    echo "✅ All changes are committed"
fi

# Check if remote origin is set
if git remote get-url origin >/dev/null 2>&1; then
    echo "✅ Git remote origin is configured"
    echo "   Remote URL: $(git remote get-url origin)"
else
    echo "⚠️  Git remote origin not configured. You'll need to add it:"
    echo "   git remote add origin <your-github-repo-url>"
fi

echo ""
echo "🎯 Next steps for Render deployment:"
echo "1. Push your code to GitHub:"
echo "   git push -u origin main"
echo ""
echo "2. Go to [Render Dashboard](https://dashboard.render.com)"
echo "3. Click 'New +' → 'Web Service'"
echo "4. Connect your GitHub repository"
echo "5. Render will use the render.yaml configuration automatically"
echo ""
echo "6. Create PostgreSQL database:"
echo "   - Name: amplifier-lights-db"
echo "   - Plan: Starter"
echo ""
echo "7. Create Redis service:"
echo "   - Name: amplifier-lights-redis"
echo "   - Plan: Starter"
echo ""
echo "8. Deploy and monitor the build logs"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
echo ""
echo "✨ Your application is ready for Render deployment!"
