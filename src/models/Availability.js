const db = require('../config/database');
const redisClient = require('../config/redis');
const config = require('../config');
const logger = require('../utils/logger');

class Availability {
  constructor() {
    this.tableName = 'inventory_snapshots';
  }

  // Get real-time availability for a product
  async getProductAvailability(productId, locationCode = null) {
    const cacheKey = `availability:${productId}:${locationCode || 'global'}`;
    
    // Try cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Cache miss for availability:', error);
    }

    let query = db(this.tableName)
      .select([
        'inventory_snapshots.*',
        'locations.code as location_code',
        'locations.name as location_name',
        'locations.timezone',
        'products.product_id',
        'products.name as product_name'
      ])
      .leftJoin('locations', 'inventory_snapshots.location_id', 'locations.id')
      .leftJoin('products', 'inventory_snapshots.product_id', 'products.id')
      .where('products.product_id', productId)
      .where('products.active', true);

    if (locationCode) {
      query = query.where('locations.code', locationCode);
    }

    const availability = await query;
    
    const result = {
      productId,
      locations: availability.map(this.transformAvailability),
      lastUpdated: new Date().toISOString(),
      globalStatus: this.calculateGlobalStatus(availability)
    };

    // Cache for short duration (real-time data)
    try {
      await redisClient.set(cacheKey, JSON.stringify(result), config.cache.availabilityTtl);
    } catch (error) {
      logger.warn('Failed to cache availability:', error);
    }

    return result;
  }

  // Update inventory for a product
  async updateInventory(productId, updates) {
    const trx = await db.transaction();
    
    try {
      const product = await trx('products')
        .where('product_id', productId)
        .first();

      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      const results = [];
      
      for (const update of updates) {
        const {
          locationCode,
          quantity,
          price,
          currency = 'USD',
          availabilityStatus,
          restockDate,
          deliveryEstimates
        } = update;

        let locationId = null;
        if (locationCode) {
          const location = await trx('locations')
            .where('code', locationCode)
            .first();
          
          if (!location) {
            throw new Error(`Location ${locationCode} not found`);
          }
          locationId = location.id;
        }

        // Get current inventory
        const currentInventory = await trx(this.tableName)
          .where('product_id', product.id)
          .where('location_id', locationId)
          .first();

        const inventoryData = {
          product_id: product.id,
          location_id: locationId,
          quantity: quantity !== undefined ? quantity : (currentInventory?.quantity || 0),
          price: price !== undefined ? price : (currentInventory?.price || product.price),
          currency,
          availability_status: availabilityStatus || this.calculateAvailabilityStatus(quantity),
          restock_date: restockDate,
          delivery_estimates: deliveryEstimates ? JSON.stringify(deliveryEstimates) : null,
          last_updated: db.fn.now()
        };

        let result;
        if (currentInventory) {
          // Update existing
          await trx(this.tableName)
            .where('id', currentInventory.id)
            .update({
              ...inventoryData,
              updated_at: db.fn.now()
            });
          
          result = { ...currentInventory, ...inventoryData, action: 'updated' };
        } else {
          // Create new
          const [newInventory] = await trx(this.tableName)
            .insert(inventoryData)
            .returning('*');
          
          result = { ...newInventory, action: 'created' };
        }

        results.push(result);

        // Check for alerts
        await this.checkAndCreateAlerts(trx, product.id, locationId, inventoryData, currentInventory);

        // Record price change if applicable
        if (currentInventory && price !== undefined && price !== currentInventory.price) {
          await this.recordPriceChange(trx, product.id, locationId, currentInventory.price, price, 'manual_update');
        }
      }

      await trx.commit();

      // Clear cache
      await this.clearAvailabilityCache(productId);

      // Trigger webhooks
      await this.triggerWebhooks('inventory_update', productId, results);

      return results;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Bulk update inventory from external system
  async bulkUpdateInventory(updates) {
    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const result = await this.updateInventory(update.productId, [update]);
        results.push({ productId: update.productId, result });
      } catch (error) {
        logger.error(`Failed to update inventory for ${update.productId}:`, error);
        errors.push({ productId: update.productId, error: error.message });
      }
    }

    return { results, errors };
  }

  // Get availability for multiple products
  async getBulkAvailability(productIds, locationCode = null) {
    const availability = {};
    
    for (const productId of productIds) {
      try {
        availability[productId] = await this.getProductAvailability(productId, locationCode);
      } catch (error) {
        logger.error(`Failed to get availability for ${productId}:`, error);
        availability[productId] = { error: error.message };
      }
    }

    return availability;
  }

  // Get low stock alerts
  async getLowStockAlerts(locationCode = null) {
    let query = db('availability_alerts')
      .select([
        'availability_alerts.*',
        'products.product_id',
        'products.name as product_name',
        'locations.code as location_code',
        'locations.name as location_name'
      ])
      .leftJoin('products', 'availability_alerts.product_id', 'products.id')
      .leftJoin('locations', 'availability_alerts.location_id', 'locations.id')
      .where('availability_alerts.processed', false)
      .whereIn('availability_alerts.alert_type', ['low_stock', 'out_of_stock']);

    if (locationCode) {
      query = query.where('locations.code', locationCode);
    }

    const alerts = await query.orderBy('availability_alerts.triggered_at', 'desc');
    return alerts.map(this.transformAlert);
  }

  // Process pending webhooks
  async processPendingWebhooks() {
    const pendingDeliveries = await db('webhook_deliveries')
      .select([
        'webhook_deliveries.*',
        'webhook_endpoints.url',
        'webhook_endpoints.headers',
        'webhook_endpoints.secret',
        'webhook_endpoints.timeout_ms',
        'webhook_endpoints.retry_count'
      ])
      .leftJoin('webhook_endpoints', 'webhook_deliveries.webhook_id', 'webhook_endpoints.id')
      .where('webhook_deliveries.status', 'pending')
      .where(function() {
        this.whereNull('webhook_deliveries.next_retry_at')
            .orWhere('webhook_deliveries.next_retry_at', '<=', db.fn.now());
      })
      .limit(50); // Process in batches

    for (const delivery of pendingDeliveries) {
      try {
        await this.deliverWebhook(delivery);
      } catch (error) {
        logger.error('Webhook delivery failed:', error);
      }
    }

    return pendingDeliveries.length;
  }

  // Helper methods
  transformAvailability(inventory) {
    return {
      locationCode: inventory.location_code,
      locationName: inventory.location_name,
      quantity: inventory.quantity,
      price: parseFloat(inventory.price),
      currency: inventory.currency,
      availabilityStatus: inventory.availability_status,
      restockDate: inventory.restock_date,
      deliveryEstimates: inventory.delivery_estimates || null,
      lastUpdated: inventory.last_updated
    };
  }

  transformAlert(alert) {
    return {
      id: alert.id,
      productId: alert.product_id,
      productName: alert.product_name,
      locationCode: alert.location_code,
      locationName: alert.location_name,
      alertType: alert.alert_type,
      thresholdValue: alert.threshold_value,
      alertData: alert.alert_data,
      triggeredAt: alert.triggered_at
    };
  }

  calculateGlobalStatus(availability) {
    if (!availability.length) return 'out_of_stock';
    
    const statuses = availability.map(a => a.availability_status);
    
    if (statuses.includes('in_stock')) return 'in_stock';
    if (statuses.includes('limited_stock')) return 'limited_stock';
    if (statuses.includes('pre_order')) return 'pre_order';
    
    return 'out_of_stock';
  }

  calculateAvailabilityStatus(quantity) {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= 5) return 'limited_stock';
    return 'in_stock';
  }

  async checkAndCreateAlerts(trx, productId, locationId, newData, oldData) {
    const alerts = [];

    // Low stock alert
    if (newData.quantity <= newData.threshold_low && 
        (!oldData || oldData.quantity > newData.threshold_low)) {
      alerts.push({
        product_id: productId,
        location_id: locationId,
        alert_type: 'low_stock',
        threshold_value: newData.quantity,
        alert_data: JSON.stringify({ threshold: newData.threshold_low })
      });
    }

    // Out of stock alert
    if (newData.quantity === 0 && (!oldData || oldData.quantity > 0)) {
      alerts.push({
        product_id: productId,
        location_id: locationId,
        alert_type: 'out_of_stock',
        threshold_value: 0,
        alert_data: JSON.stringify({ previousQuantity: oldData?.quantity || 0 })
      });
    }

    // Restock alert
    if (newData.quantity > 0 && oldData && oldData.quantity === 0) {
      alerts.push({
        product_id: productId,
        location_id: locationId,
        alert_type: 'restock',
        threshold_value: newData.quantity,
        alert_data: JSON.stringify({ newQuantity: newData.quantity })
      });
    }

    if (alerts.length > 0) {
      await trx('availability_alerts').insert(alerts);
    }
  }

  async recordPriceChange(trx, productId, locationId, oldPrice, newPrice, reason) {
    await trx('price_history').insert({
      product_id: productId,
      location_id: locationId,
      old_price: oldPrice,
      new_price: newPrice,
      change_reason: reason,
      metadata: JSON.stringify({
        change_percentage: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2)
      })
    });
  }

  async clearAvailabilityCache(productId) {
    try {
      // Clear all location-specific caches for this product
      await redisClient.del(`availability:${productId}:global`);
      // Could expand to clear location-specific caches too
    } catch (error) {
      logger.warn('Failed to clear availability cache:', error);
    }
  }

  async triggerWebhooks(eventType, productId, data) {
    try {
      const webhooks = await db('webhook_endpoints')
        .where('event_type', eventType)
        .where('active', true);

      for (const webhook of webhooks) {
        await db('webhook_deliveries').insert({
          webhook_id: webhook.id,
          product_id: productId,
          payload: JSON.stringify({
            event: eventType,
            productId,
            data,
            timestamp: new Date().toISOString()
          }),
          status: 'pending'
        });
      }
    } catch (error) {
      logger.error('Failed to queue webhooks:', error);
    }
  }

  async deliverWebhook(delivery) {
    // This would implement the actual HTTP delivery
    // For now, just mark as delivered (webhook implementation would be more complex)
    await db('webhook_deliveries')
      .where('id', delivery.id)
      .update({
        status: 'delivered',
        delivered_at: db.fn.now(),
        http_status: 200,
        response_body: 'Mock delivery success'
      });
  }
}

module.exports = new Availability();