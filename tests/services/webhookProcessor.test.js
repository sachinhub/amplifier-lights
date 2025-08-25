const WebhookProcessor = require('../../src/services/webhookProcessor');
const axios = require('axios');
const crypto = require('crypto');

// Mock dependencies
jest.mock('axios');
jest.mock('../../src/config/database');
jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-signature')
  }),
  timingSafeEqual: jest.fn().mockReturnValue(true)
}));

const db = require('../../src/config/database');

describe('WebhookProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    WebhookProcessor.stopProcessor();
  });

  describe('processPendingDeliveries', () => {
    test('should process pending webhook deliveries', async () => {
      const mockDeliveries = [
        {
          id: 1,
          url: 'https://example.com/webhook',
          payload: '{"test": "data"}',
          headers: '{}',
          secret: 'test-secret',
          timeout_ms: 5000,
          attempt_count: 1,
          retry_count: 3
        }
      ];

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockDeliveries)
      });

      // Mock successful HTTP response
      axios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });

      // Mock database update
      db.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1)
      });

      const result = await WebhookProcessor.processPendingDeliveries();
      
      expect(result).toBe(1);
      expect(axios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        { test: 'data' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'AmplifiER-Light-Webhook/1.0',
            'X-Webhook-Signature': 'sha256=mocked-signature'
          }),
          timeout: 5000
        })
      );
    });

    test('should handle no pending deliveries', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      const result = await WebhookProcessor.processPendingDeliveries();
      
      expect(result).toBe(0);
    });
  });

  describe('processDelivery', () => {
    test('should mark delivery as delivered on success', async () => {
      const delivery = {
        id: 1,
        url: 'https://example.com/webhook',
        payload: '{"test": "data"}',
        headers: '{}',
        secret: 'test-secret',
        timeout_ms: 5000,
        attempt_count: 1
      };

      axios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });

      const mockUpdate = jest.fn().mockResolvedValue(1);
      db.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        update: mockUpdate
      });

      await WebhookProcessor.processDelivery(delivery);
      
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'delivered',
          httpStatus: 200
        })
      );
    });

    test('should schedule retry on retryable error', async () => {
      const delivery = {
        id: 1,
        url: 'https://example.com/webhook',
        payload: '{"test": "data"}',
        headers: '{}',
        attempt_count: 1,
        retry_count: 3
      };

      const retryableError = new Error('ECONNRESET');
      retryableError.code = 'ECONNRESET';
      axios.post.mockRejectedValue(retryableError);

      const mockUpdate = jest.fn().mockResolvedValue(1);
      db.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        update: mockUpdate
      });

      await WebhookProcessor.processDelivery(delivery);
      
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          attemptCount: 2,
          nextRetryAt: expect.any(Date)
        })
      );
    });

    test('should mark as failed when max retries exceeded', async () => {
      const delivery = {
        id: 1,
        url: 'https://example.com/webhook',
        payload: '{"test": "data"}',
        headers: '{}',
        attempt_count: 3,
        retry_count: 3
      };

      const error = new Error('Max retries exceeded');
      axios.post.mockRejectedValue(error);

      const mockUpdate = jest.fn().mockResolvedValue(1);
      db.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        update: mockUpdate
      });

      await WebhookProcessor.processDelivery(delivery);
      
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed'
        })
      );
    });
  });

  describe('generateSignature', () => {
    test('should generate HMAC signature', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      
      const signature = WebhookProcessor.generateSignature(payload, secret);
      
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', secret);
      expect(signature).toBe('mocked-signature');
    });
  });

  describe('verifySignature', () => {
    test('should verify webhook signature', () => {
      const payload = '{"test": "data"}';
      const signature = 'sha256=mocked-signature';
      const secret = 'test-secret';
      
      const isValid = WebhookProcessor.verifySignature(payload, signature, secret);
      
      expect(isValid).toBe(true);
      expect(crypto.timingSafeEqual).toHaveBeenCalled();
    });
  });

  describe('isRetryableError', () => {
    test('should identify retryable network errors', () => {
      const connectError = { code: 'ECONNRESET' };
      const refusedError = { code: 'ECONNREFUSED' };
      const timeoutError = { code: 'ETIMEDOUT' };
      
      expect(WebhookProcessor.isRetryableError(connectError)).toBe(true);
      expect(WebhookProcessor.isRetryableError(refusedError)).toBe(true);
      expect(WebhookProcessor.isRetryableError(timeoutError)).toBe(true);
    });

    test('should identify retryable HTTP status codes', () => {
      const serverError = { response: { status: 500 } };
      const badGateway = { response: { status: 502 } };
      const timeout = { response: { status: 408 } };
      const tooManyRequests = { response: { status: 429 } };
      
      expect(WebhookProcessor.isRetryableError(serverError)).toBe(true);
      expect(WebhookProcessor.isRetryableError(badGateway)).toBe(true);
      expect(WebhookProcessor.isRetryableError(timeout)).toBe(true);
      expect(WebhookProcessor.isRetryableError(tooManyRequests)).toBe(true);
    });

    test('should identify non-retryable errors', () => {
      const badRequest = { response: { status: 400 } };
      const unauthorized = { response: { status: 401 } };
      const notFound = { response: { status: 404 } };
      
      expect(WebhookProcessor.isRetryableError(badRequest)).toBe(false);
      expect(WebhookProcessor.isRetryableError(unauthorized)).toBe(false);
      expect(WebhookProcessor.isRetryableError(notFound)).toBe(false);
    });
  });

  describe('queueWebhook', () => {
    test('should queue webhook for delivery', async () => {
      const mockInsert = jest.fn().mockResolvedValue([{ id: 1 }]);
      db.mockReturnValue({
        insert: mockInsert
      });

      const eventData = {
        event: 'inventory_update',
        data: { quantity: 100 }
      };

      await WebhookProcessor.queueWebhook(1, 'TEST-001', eventData);
      
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_id: 1,
          product_id: 'TEST-001',
          payload: expect.stringContaining('inventory_update'),
          status: 'pending',
          attempt_count: 1
        })
      );
    });
  });

  describe('getDeliveryStats', () => {
    test('should return delivery statistics', async () => {
      const mockStats = {
        total: 100,
        delivered: 85,
        failed: 10,
        pending: 5,
        avg_delivery_time: 2.5
      };

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockStats)
      });

      const result = await WebhookProcessor.getDeliveryStats(1, 24);
      
      expect(result.webhookId).toBe(1);
      expect(result.period).toBe('24 hours');
      expect(result.total).toBe(100);
      expect(result.delivered).toBe(85);
      expect(result.successRate).toBe('85.00');
      expect(result.averageDeliveryTime).toBe('2.50');
    });

    test('should handle zero deliveries', async () => {
      const mockStats = {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        avg_delivery_time: null
      };

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockStats)
      });

      const result = await WebhookProcessor.getDeliveryStats(1);
      
      expect(result.successRate).toBe(0);
      expect(result.averageDeliveryTime).toBeNull();
    });
  });

  describe('cleanupOldDeliveries', () => {
    test('should clean up old webhook deliveries', async () => {
      const mockDelete = jest.fn().mockResolvedValue(50);
      db.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        del: mockDelete
      });

      const result = await WebhookProcessor.cleanupOldDeliveries(30);
      
      expect(result).toBe(50);
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('startProcessor and stopProcessor', () => {
    test('should start and stop webhook processor', async () => {
      jest.spyOn(WebhookProcessor, 'processPendingDeliveries').mockResolvedValue(0);
      
      await WebhookProcessor.startProcessor();
      expect(WebhookProcessor.processingInterval).toBeDefined();
      
      WebhookProcessor.stopProcessor();
      expect(WebhookProcessor.processingInterval).toBeNull();
    });
  });
});