const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const logger = require('./utils/logger');
const rateLimiter = require('./middleware/rateLimiter');

class Application {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  async initializeRateLimiter(redisClient) {
    await rateLimiter.init(redisClient);
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Allow AI crawlers to read content
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors({
      origin: config.api.corsOrigin,
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(rateLimiter.middleware());

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        crawlerType: req.crawlerType
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv
      });
    });

    // API version endpoint
    this.app.get(`/api/${config.api.version}`, (req, res) => {
      res.json({
        name: 'AmplifiER - Light',
        version: config.api.version,
        description: 'AI-optimized product endpoints for agentic commerce',
        endpoints: {
          products: `/api/${config.api.version}/products`,
          categories: `/api/${config.api.version}/categories`,
          availability: `/api/${config.api.version}/availability`,
          ai: '/ai'
        }
      });
    });

    // Mount API routes
    this.app.use(`/api/${config.api.version}`, require('./routes'));

    // Robots.txt - dynamically generated for AI crawlers
    this.app.get('/robots.txt', (req, res) => {
      const robots = `User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot  
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: claude-web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: *
Disallow: /admin
Disallow: /internal

Sitemap: ${req.protocol}://${req.get('host')}/ai/sitemap.xml`;

      res.type('text/plain');
      res.send(robots);
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.path
      });
    });
  }

  setupErrorHandling() {
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', err);
      
      res.status(err.status || 500).json({
        error: config.nodeEnv === 'production' ? 'Internal Server Error' : err.message,
        ...(config.nodeEnv !== 'production' && { stack: err.stack })
      });
    });
  }

  getApp() {
    return this.app;
  }
}

module.exports = Application;