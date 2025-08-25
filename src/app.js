const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const logger = require('./utils/logger');
const rateLimiter = require('./middleware/rateLimiter');
const Product = require('./models/Product');

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
Crawl-delay: 1

User-agent: OAI-SearchBot  
Allow: /
Crawl-delay: 1

User-agent: ChatGPT-User
Allow: /
Crawl-delay: 1

User-agent: ClaudeBot
Allow: /
Crawl-delay: 1

User-agent: anthropic-ai
Allow: /
Crawl-delay: 1

User-agent: claude-web
Allow: /
Crawl-delay: 1

User-agent: PerplexityBot
Allow: /
Crawl-delay: 2

User-agent: Bard
Allow: /
Crawl-delay: 2

User-agent: Gemini
Allow: /
Crawl-delay: 2

User-agent: BingBot
Allow: /
Crawl-delay: 3

User-agent: *
Disallow: /admin
Disallow: /internal
Crawl-delay: 5

Sitemap: ${req.protocol}://${req.get('host')}/ai/sitemap.xml`;

      res.type('text/plain');
      res.send(robots);
    });

    // AI Sitemap - dynamically generated for crawlers
    this.app.get('/ai/sitemap.xml', async (req, res) => {
      try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const products = await Product.findAll({ limit: 1000, featured: true });
        
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/api/v1</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/api/v1/products</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/api/v1/categories</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

        // Add individual products
        products.forEach(product => {
          const lastMod = product.updatedAt ? 
            new Date(product.updatedAt).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0];
          
          sitemap += `
  <url>
    <loc>${baseUrl}/api/v1/products/${product.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${product.featured ? '0.8' : '0.6'}</priority>
  </url>`;
        });

        sitemap += `
</urlset>`;

        res.type('application/xml');
        res.send(sitemap);
      } catch (error) {
        logger.error('Error generating sitemap:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to generate sitemap'
        });
      }
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