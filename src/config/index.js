require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/amplifier_light'
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  api: {
    version: process.env.API_VERSION || 'v1',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    aiCrawlers: {
      gptbot: parseInt(process.env.GPTBOT_RATE_LIMIT) || 200,
      claudebot: parseInt(process.env.CLAUDEBOT_RATE_LIMIT) || 200,
      perplexitybot: parseInt(process.env.PERPLEXITYBOT_RATE_LIMIT) || 200
    }
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  },
  
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 300,
    availabilityTtl: parseInt(process.env.AVAILABILITY_CACHE_TTL) || 60
  }
};