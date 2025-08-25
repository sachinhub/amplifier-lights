const { RateLimiterRedis } = require('rate-limiter-flexible');
const redisClient = require('../config/redis');
const config = require('../config');
const logger = require('../utils/logger');

class RateLimiter {
  constructor() {
    this.limiters = new Map();
    this.initialized = false;
  }

  async init(redisClientInstance) {
    if (this.initialized) return;

    // Default rate limiter
    this.limiters.set('default', new RateLimiterRedis({
      storeClient: redisClientInstance,
      keyPrefix: 'rl_default',
      points: config.rateLimit.maxRequests,
      duration: Math.floor(config.rateLimit.windowMs / 1000)
    }));

    // AI Crawler specific limiters
    const aiCrawlers = {
      'gptbot': config.rateLimit.aiCrawlers.gptbot,
      'claudebot': config.rateLimit.aiCrawlers.claudebot,
      'perplexitybot': config.rateLimit.aiCrawlers.perplexitybot
    };

    Object.entries(aiCrawlers).forEach(([bot, limit]) => {
      this.limiters.set(bot, new RateLimiterRedis({
        storeClient: redisClientInstance,
        keyPrefix: `rl_${bot}`,
        points: limit,
        duration: 60 // 1 minute
      }));
    });

    this.initialized = true;
  }

  detectCrawler(userAgent) {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('gptbot') || ua.includes('oai-searchbot') || ua.includes('chatgpt')) {
      return 'gptbot';
    }
    
    if (ua.includes('claudebot') || ua.includes('anthropic-ai') || ua.includes('claude-web')) {
      return 'claudebot';
    }
    
    if (ua.includes('perplexitybot')) {
      return 'perplexitybot';
    }
    
    return 'default';
  }

  middleware() {
    return async (req, res, next) => {
      try {
        // If not initialized, skip rate limiting
        if (!this.initialized) {
          return next();
        }

        const userAgent = req.get('User-Agent') || '';
        const crawlerType = this.detectCrawler(userAgent);
        const limiter = this.limiters.get(crawlerType);
        
        if (!limiter) {
          return next();
        }

        const key = req.ip || req.connection.remoteAddress;
        await limiter.consume(key);
        
        // Add crawler type to request for downstream processing
        req.crawlerType = crawlerType;
        
        logger.debug(`Rate limit check passed for ${crawlerType} from ${key}`);
        next();
      } catch (rejRes) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${secs} seconds.`,
          retryAfter: secs
        });
      }
    };
  }
}

module.exports = new RateLimiter();