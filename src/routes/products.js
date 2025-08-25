const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const CSVImporter = require('../services/csvImporter');
const redisClient = require('../config/redis');
const config = require('../config');
const logger = require('../utils/logger');
const Joi = require('joi');
const aiCrawler = require('../services/aiCrawlerIntelligence');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Validation schemas
const productQuerySchema = Joi.object({
  category: Joi.string(),
  brand: Joi.string(),
  availability: Joi.string().valid('in_stock', 'limited_stock', 'out_of_stock', 'discontinued'),
  featured: Joi.boolean(),
  limit: Joi.number().integer().min(1).max(1000).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

const searchQuerySchema = Joi.object({
  q: Joi.string().required().min(2).max(500),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Cache helper
async function getCachedResponse(key, ttl = config.cache.ttl) {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
}

async function setCachedResponse(key, data, ttl = config.cache.ttl) {
  try {
    await redisClient.set(key, JSON.stringify(data), ttl);
  } catch (error) {
    logger.error('Cache set error:', error);
  }
}

// GET /products - Get all products with filtering
router.get('/', async (req, res) => {
  try {
    const { error, value: filters } = productQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.details[0].message
      });
    }

    const cacheKey = `products:${JSON.stringify(filters)}`;
    let products = await getCachedResponse(cacheKey);

    if (!products) {
      products = await Product.findAll(filters);
      await setCachedResponse(cacheKey, products);
    }

    // Add JSON-LD for AI crawlers if detected
    let response = {
      products,
      total: products.length,
      filters: filters
    };

    // Apply AI crawler optimizations
    if (req.crawlerType && req.crawlerType !== 'default') {
      response.jsonLD = await Promise.all(
        products.slice(0, 10).map(product => Product.generateJsonLD(product, req))
      );
      
      // Apply content optimization
      response = aiCrawler.optimizeContentForCrawler(response, req.crawlerType);
      
      // Log analytics
      aiCrawler.logCrawlerInteraction(
        req.crawlerType, 
        req.originalUrl, 
        req.get('User-Agent'),
        JSON.stringify(response).length
      );
    }

    res.json(response);
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch products'
    });
  }
});

// GET /products/search - Search products
router.get('/search', async (req, res) => {
  try {
    const { error, value } = searchQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.details[0].message
      });
    }

    const { q: query, limit } = value;
    const cacheKey = `search:${query}:${limit}`;
    let results = await getCachedResponse(cacheKey, 300); // 5 minutes cache

    if (!results) {
      results = await Product.search(query, { limit });
      await setCachedResponse(cacheKey, results, 300);
    }

    let response = {
      query,
      results,
      total: results.length
    };

    // Apply AI crawler optimizations
    if (req.crawlerType && req.crawlerType !== 'default') {
      response.jsonLD = await Promise.all(
        results.slice(0, 5).map(product => Product.generateJsonLD(product, req))
      );
      
      // Apply content optimization
      response = aiCrawler.optimizeContentForCrawler(response, req.crawlerType);
      
      // Log analytics
      aiCrawler.logCrawlerInteraction(
        req.crawlerType, 
        req.originalUrl, 
        req.get('User-Agent'),
        JSON.stringify(response).length
      );
    }

    res.json(response);
  } catch (error) {
    logger.error('Error searching products:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search products'
    });
  }
});

// GET /products/compare - Compare multiple products
router.get('/compare', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Product IDs are required'
      });
    }

    const productIds = Array.isArray(ids) ? ids : ids.split(',');
    if (productIds.length < 2 || productIds.length > 10) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide between 2 and 10 product IDs'
      });
    }

    const cacheKey = `compare:${productIds.sort().join(',')}`;
    let comparison = await getCachedResponse(cacheKey);

    if (!comparison) {
      const products = await Product.getComparison(productIds);
      
      // Generate comparison data
      comparison = {
        products,
        comparison: generateComparisonMatrix(products)
      };
      
      await setCachedResponse(cacheKey, comparison);
    }

    // Add JSON-LD for AI crawlers
    if (req.crawlerType && req.crawlerType !== 'default') {
      comparison.jsonLD = await Promise.all(
        comparison.products.map(product => Product.generateJsonLD(product, req))
      );
    }

    res.json(comparison);
  } catch (error) {
    logger.error('Error comparing products:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to compare products'
    });
  }
});

// GET /products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `product:${id}`;
    let product = await getCachedResponse(cacheKey);

    if (!product) {
      product = await Product.findById(id);
      if (product) {
        await setCachedResponse(cacheKey, product);
      }
    }

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found'
      });
    }

    let response = { product };

    // Apply AI crawler optimizations
    if (req.crawlerType && req.crawlerType !== 'default') {
      response.jsonLD = await Product.generateJsonLD(product, req);
      
      // Apply content optimization
      response = aiCrawler.optimizeContentForCrawler(response, req.crawlerType);
      
      // Log analytics
      aiCrawler.logCrawlerInteraction(
        req.crawlerType, 
        req.originalUrl, 
        req.get('User-Agent'),
        JSON.stringify(response).length
      );
    }

    res.json(response);
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch product'
    });
  }
});

// POST /products/import - Import products from CSV
router.post('/import', upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'CSV file is required'
      });
    }

    const importer = new CSVImporter();
    const result = await importer.importProducts(req.file.path);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Clear product cache
    await redisClient.del('products:*');

    res.json({
      message: 'Import completed',
      result: {
        successful: result.success.length,
        failed: result.failed.length,
        errors: result.errors
      }
    });
  } catch (error) {
    logger.error('Error importing products:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to import products'
    });
  }
});

// Helper function to generate comparison matrix
function generateComparisonMatrix(products) {
  if (products.length < 2) return {};

  const specifications = new Set();
  products.forEach(product => {
    Object.keys(product.specifications || {}).forEach(spec => {
      specifications.add(spec);
    });
  });

  const matrix = {};
  specifications.forEach(spec => {
    matrix[spec] = products.map(product => ({
      productId: product.id,
      value: product.specifications?.[spec] || 'N/A'
    }));
  });

  // Add common comparison fields
  ['price', 'rating', 'availability'].forEach(field => {
    matrix[field] = products.map(product => ({
      productId: product.id,
      value: field === 'price' ? product.price :
             field === 'rating' ? product.rating.average :
             product.availability.status
    }));
  });

  return matrix;
}

module.exports = router;