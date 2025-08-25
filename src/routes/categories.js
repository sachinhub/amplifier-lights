const express = require('express');
const db = require('../config/database');
const redisClient = require('../config/redis');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

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

// GET /categories - Get all categories with product counts
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'categories:all';
    let categories = await getCachedResponse(cacheKey);

    if (!categories) {
      categories = await db('categories')
        .select([
          'categories.*',
          db.raw('COUNT(products.id) as product_count')
        ])
        .leftJoin('products', function() {
          this.on('categories.id', '=', 'products.category_id')
              .andOn('products.active', '=', db.raw('true'));
        })
        .groupBy('categories.id')
        .orderBy('categories.name');

      // Build hierarchical structure
      const categoryMap = new Map();
      const rootCategories = [];

      // First pass: create map
      categories.forEach(cat => {
        categoryMap.set(cat.id, {
          ...cat,
          children: []
        });
      });

      // Second pass: build hierarchy
      categories.forEach(cat => {
        const category = categoryMap.get(cat.id);
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            parent.children.push(category);
          }
        } else {
          rootCategories.push(category);
        }
      });

      categories = rootCategories;
      await setCachedResponse(cacheKey, categories);
    }

    res.json({
      categories
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch categories'
    });
  }
});

// GET /categories/:slug - Get category by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `category:${slug}`;
    let category = await getCachedResponse(cacheKey);

    if (!category) {
      category = await db('categories')
        .select([
          'categories.*',
          db.raw('COUNT(products.id) as product_count')
        ])
        .leftJoin('products', function() {
          this.on('categories.id', '=', 'products.category_id')
              .andOn('products.active', '=', db.raw('true'));
        })
        .where('categories.slug', slug)
        .groupBy('categories.id')
        .first();

      if (category) {
        await setCachedResponse(cacheKey, category);
      }
    }

    if (!category) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Category not found'
      });
    }

    res.json({ category });
  } catch (error) {
    logger.error('Error fetching category:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch category'
    });
  }
});

module.exports = router;