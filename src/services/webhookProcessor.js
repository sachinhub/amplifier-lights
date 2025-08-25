const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/database');
const logger = require('../utils/logger');

class WebhookProcessor {
  constructor() {
    this.maxRetries = 3;
    this.retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s
  }

  // Start webhook processing worker
  async startProcessor() {
    logger.info('Starting webhook processor...');
    
    // Process pending webhooks every 30 seconds
    this.processingInterval = setInterval(async () => {
      try {
        await this.processPendingDeliveries();
      } catch (error) {
        logger.error('Webhook processing cycle failed:', error);
      }
    }, 30000);

    // Initial processing
    await this.processPendingDeliveries();
    
    logger.info('Webhook processor started');
  }

  // Stop webhook processing worker
  stopProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('Webhook processor stopped');
    }
  }

  // Process pending webhook deliveries
  async processPendingDeliveries() {
    try {
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
        .where('webhook_endpoints.active', true)
        .where(function() {
          this.whereNull('webhook_deliveries.next_retry_at')
              .orWhere('webhook_deliveries.next_retry_at', '<=', db.fn.now());
        })
        .orderBy('webhook_deliveries.created_at')
        .limit(50); // Process in batches

      if (pendingDeliveries.length === 0) {
        return 0;
      }

      logger.info(`Processing ${pendingDeliveries.length} pending webhook deliveries`);

      for (const delivery of pendingDeliveries) {
        await this.processDelivery(delivery);
      }

      return pendingDeliveries.length;
    } catch (error) {
      logger.error('Failed to process pending deliveries:', error);
      throw error;
    }
  }

  // Process individual webhook delivery
  async processDelivery(delivery) {
    const startTime = Date.now();
    
    try {
      logger.debug(`Processing webhook delivery ${delivery.id} to ${delivery.url}`);

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'AmplifiER-Light-Webhook/1.0',
        ...JSON.parse(delivery.headers || '{}')
      };

      // Add signature if secret is provided
      if (delivery.secret) {
        const signature = this.generateSignature(delivery.payload, delivery.secret);
        headers['X-Webhook-Signature'] = `sha256=${signature}`;
      }

      // Make HTTP request
      const response = await axios.post(delivery.url, JSON.parse(delivery.payload), {
        headers,
        timeout: delivery.timeout_ms || 5000,
        validateStatus: status => status >= 200 && status < 300
      });

      // Mark as delivered
      await this.markDeliveryStatus(delivery.id, 'delivered', {
        httpStatus: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 1000), // Limit size
        deliveredAt: new Date(),
        processingTime: Date.now() - startTime
      });

      logger.info(`Webhook delivery ${delivery.id} succeeded`, {
        url: delivery.url,
        status: response.status,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      const shouldRetry = delivery.attempt_count < (delivery.retry_count || this.maxRetries) && isRetryable;

      if (shouldRetry) {
        // Schedule retry
        const nextRetryDelay = this.retryDelays[Math.min(delivery.attempt_count, this.retryDelays.length - 1)];
        const nextRetryAt = new Date(Date.now() + nextRetryDelay);

        await this.markDeliveryStatus(delivery.id, 'pending', {
          httpStatus: error.response?.status || null,
          responseBody: error.message.substring(0, 1000),
          attemptCount: delivery.attempt_count + 1,
          nextRetryAt,
          processingTime: Date.now() - startTime
        });

        logger.warn(`Webhook delivery ${delivery.id} failed, scheduled for retry`, {
          url: delivery.url,
          attempt: delivery.attempt_count + 1,
          nextRetryAt,
          error: error.message
        });
      } else {
        // Mark as failed
        await this.markDeliveryStatus(delivery.id, 'failed', {
          httpStatus: error.response?.status || null,
          responseBody: error.message.substring(0, 1000),
          processingTime: Date.now() - startTime
        });

        logger.error(`Webhook delivery ${delivery.id} permanently failed`, {
          url: delivery.url,
          attempts: delivery.attempt_count,
          error: error.message
        });
      }
    }
  }

  // Mark delivery status in database
  async markDeliveryStatus(deliveryId, status, updates = {}) {
    const updateData = {
      status,
      ...updates
    };

    // Clean up update data
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await db('webhook_deliveries')
      .where('id', deliveryId)
      .update(updateData);
  }

  // Generate webhook signature
  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  // Verify webhook signature
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    const providedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }

  // Check if error is retryable
  isRetryableError(error) {
    if (error.code === 'ECONNRESET' || 
        error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT') {
      return true;
    }

    if (error.response) {
      const status = error.response.status;
      // Retry on 5xx errors and specific 4xx errors
      return status >= 500 || status === 408 || status === 429;
    }

    return false;
  }

  // Queue webhook for delivery
  async queueWebhook(webhookId, productId, eventData) {
    try {
      const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        event: eventData.event,
        productId,
        data: eventData.data
      });

      await db('webhook_deliveries').insert({
        webhook_id: webhookId,
        product_id: productId,
        payload,
        status: 'pending',
        attempt_count: 1
      });

      logger.debug(`Queued webhook delivery for webhook ${webhookId}`);
    } catch (error) {
      logger.error('Failed to queue webhook:', error);
      throw error;
    }
  }

  // Get webhook delivery stats
  async getDeliveryStats(webhookId, hours = 24) {
    try {
      const stats = await db('webhook_deliveries')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN status = \'delivered\' THEN 1 END) as delivered'),
          db.raw('COUNT(CASE WHEN status = \'failed\' THEN 1 END) as failed'),
          db.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending'),
          db.raw('AVG(CASE WHEN status = \'delivered\' THEN EXTRACT(EPOCH FROM (delivered_at - created_at)) END) as avg_delivery_time')
        )
        .where('webhook_id', webhookId)
        .where('created_at', '>=', db.raw('NOW() - INTERVAL ? HOUR', [hours]))
        .first();

      return {
        webhookId,
        period: `${hours} hours`,
        total: parseInt(stats.total),
        delivered: parseInt(stats.delivered),
        failed: parseInt(stats.failed),
        pending: parseInt(stats.pending),
        successRate: stats.total > 0 ? (stats.delivered / stats.total * 100).toFixed(2) : 0,
        averageDeliveryTime: stats.avg_delivery_time ? parseFloat(stats.avg_delivery_time).toFixed(2) : null
      };
    } catch (error) {
      logger.error('Failed to get delivery stats:', error);
      throw error;
    }
  }

  // Clean up old webhook deliveries
  async cleanupOldDeliveries(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await db('webhook_deliveries')
        .where('created_at', '<', cutoffDate)
        .whereIn('status', ['delivered', 'failed'])
        .del();

      logger.info(`Cleaned up ${deletedCount} old webhook deliveries`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old deliveries:', error);
      throw error;
    }
  }
}

module.exports = new WebhookProcessor();