const express = require('express');
const Joi = require('joi');
const Availability = require('../models/Availability');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const availabilityQuerySchema = Joi.object({
  location: Joi.string().optional(),
  ids: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional()
});

const inventoryUpdateSchema = Joi.object({
  productId: Joi.string().required(),
  updates: Joi.array().items(Joi.object({
    locationCode: Joi.string().optional(),
    quantity: Joi.number().integer().min(0).optional(),
    price: Joi.number().positive().optional(),
    currency: Joi.string().length(3).optional(),
    availabilityStatus: Joi.string().valid('in_stock', 'limited_stock', 'out_of_stock', 'discontinued', 'pre_order').optional(),
    restockDate: Joi.date().optional(),
    deliveryEstimates: Joi.object().optional()
  })).min(1).required()
});

const bulkUpdateSchema = Joi.array().items(inventoryUpdateSchema).min(1);

// GET /availability/alerts - Get low stock and availability alerts
router.get('/alerts', async (req, res) => {
  try {
    const { location } = req.query;
    const alerts = await Availability.getLowStockAlerts(location);

    res.json({
      alerts,
      count: alerts.length,
      location: location || 'all',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch alerts'
    });
  }
});

// GET /availability/system/status - System health check for availability engine
router.get('/system/status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      availability_engine: 'operational',
      cache: 'operational',
      database: 'operational'
    };

    // Test Redis connection
    try {
      await require('../config/redis').get('health_check');
      status.cache = 'operational';
    } catch (error) {
      status.cache = 'degraded';
      logger.warn('Redis health check failed:', error);
    }

    // Test database connection
    try {
      await require('../config/database').raw('SELECT 1');
      status.database = 'operational';
    } catch (error) {
      status.database = 'degraded';
      logger.warn('Database health check failed:', error);
    }

    const httpStatus = (status.cache === 'operational' && status.database === 'operational') ? 200 : 503;
    res.status(httpStatus).json(status);

  } catch (error) {
    logger.error('System status check failed:', error);
    res.status(503).json({
      timestamp: new Date().toISOString(),
      availability_engine: 'error',
      error: error.message
    });
  }
});

// GET /availability/:productId - Get real-time availability for a product
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { error, value } = availabilityQuerySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.details[0].message
      });
    }

    const availability = await Availability.getProductAvailability(productId, value.location);
    
    if (!availability.locations.length) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product availability not found'
      });
    }

    res.json(availability);
  } catch (error) {
    logger.error('Error fetching availability:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch availability'
    });
  }
});

// GET /availability - Get availability for multiple products
router.get('/', async (req, res) => {
  try {
    const { error, value } = availabilityQuerySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.details[0].message
      });
    }

    if (!value.ids) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Product IDs are required'
      });
    }

    const productIds = Array.isArray(value.ids) ? value.ids : value.ids.split(',');
    
    if (productIds.length > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Maximum 100 products allowed per request'
      });
    }

    const availability = await Availability.getBulkAvailability(productIds, value.location);

    res.json({
      location: value.location || 'global',
      products: availability,
      requestedCount: productIds.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching bulk availability:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch availability'
    });
  }
});

// POST /availability/update - Update inventory for a product
router.post('/update', async (req, res) => {
  try {
    const { error, value } = inventoryUpdateSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.details[0].message
      });
    }

    const result = await Availability.updateInventory(value.productId, value.updates);

    res.json({
      message: 'Inventory updated successfully',
      productId: value.productId,
      updates: result.length,
      results: result
    });
  } catch (error) {
    logger.error('Error updating inventory:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update inventory'
    });
  }
});

// POST /availability/bulk-update - Bulk update inventory for multiple products
router.post('/bulk-update', async (req, res) => {
  try {
    const { error, value } = bulkUpdateSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.details[0].message
      });
    }

    if (value.length > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Maximum 100 products allowed per bulk update'
      });
    }

    const result = await Availability.bulkUpdateInventory(value);

    res.json({
      message: 'Bulk inventory update completed',
      successful: result.results.length,
      failed: result.errors.length,
      results: result.results,
      errors: result.errors
    });
  } catch (error) {
    logger.error('Error in bulk inventory update:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process bulk update'
    });
  }
});

// POST /availability/webhook - Webhook endpoint for external inventory systems
router.post('/webhook', async (req, res) => {
  try {
    // Validate webhook signature (simplified for demo)
    const signature = req.headers['x-webhook-signature'];
    if (!signature) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing webhook signature'
      });
    }

    // Process webhook payload
    const { products } = req.body;
    
    if (!Array.isArray(products)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Products array is required'
      });
    }

    const updates = products.map(product => ({
      productId: product.id || product.product_id || product.sku,
      updates: [{
        locationCode: product.location,
        quantity: product.quantity,
        price: product.price,
        currency: product.currency,
        availabilityStatus: product.status,
        restockDate: product.restock_date
      }]
    }));

    const result = await Availability.bulkUpdateInventory(updates);

    // Respond quickly to webhook
    res.json({
      message: 'Webhook processed successfully',
      processed: result.results.length,
      errors: result.errors.length
    });

    // Log webhook processing
    logger.info('Webhook processed:', {
      productsReceived: products.length,
      successful: result.results.length,
      failed: result.errors.length,
      signature: signature.substring(0, 10) + '...'
    });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process webhook'
    });
  }
});

module.exports = router;