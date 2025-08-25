#!/bin/bash

# Start Amplifier Lights locally with proper environment setup

echo "🚀 Starting Amplifier Lights locally..."

# Check if PostgreSQL is running
if ! brew services list | grep -q "postgresql.*started"; then
    echo "❌ PostgreSQL is not running. Starting it..."
    brew services start postgresql
    sleep 3
fi

# Check if Redis is running
if ! brew services list | grep -q "redis.*started"; then
    echo "❌ Redis is not running. Starting it..."
    brew services start redis
    sleep 2
fi

# Set environment variables for local development
export NODE_ENV=development
export PORT=3000
export DATABASE_URL="postgresql://Sachin@localhost:5432/amplifier_light"
export REDIS_URL="redis://localhost:6379"
export API_VERSION=v1
export CORS_ORIGIN="*"
export LOG_LEVEL=debug
export LOG_FILE=logs/app.log
export RATE_LIMIT_WINDOW_MS=60000
export RATE_LIMIT_MAX_REQUESTS=100
export GPTBOT_RATE_LIMIT=200
export CLAUDEBOT_RATE_LIMIT=200
export PERPLEXITYBOT_RATE_LIMIT=200
export CACHE_TTL=300
export AVAILABILITY_CACHE_TTL=60

echo "✅ Environment variables set:"
echo "   NODE_ENV: $NODE_ENV"
echo "   PORT: $PORT"
echo "   DATABASE_URL: $DATABASE_URL"
echo "   REDIS_URL: $REDIS_URL"

# Check if database exists and run migrations if needed
echo "🔍 Checking database connection..."
if psql -U Sachin -h localhost -d amplifier_light -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database connection successful"
    
    # Check if migrations table exists
    if psql -U Sachin -h localhost -d amplifier_light -c "SELECT * FROM knex_migrations LIMIT 1;" >/dev/null 2>&1; then
        echo "✅ Migrations table exists"
    else
        echo "⚠️  Migrations table not found. Running migrations..."
        npm run migrate
    fi
else
    echo "❌ Database connection failed"
    exit 1
fi

echo "🚀 Starting application..."
npm start
