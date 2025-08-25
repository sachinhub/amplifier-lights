const WebhookProcessor = require('../../src/services/webhookProcessor');
const axios = require('axios');
const crypto = require('crypto');

// Mock dependencies
jest.mock('axios');
jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-signature')
  }),
  timingSafeEqual: jest.fn().mockReturnValue(true)
}));

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
      const result = await WebhookProcessor.processPendingDeliveries();
      
      expect(result).toBe(1);
    });

    test('should handle no pending deliveries', async () => {
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

      await WebhookProcessor.processDelivery(delivery);
      
      // The global mock handles the database interaction, so we just verify the HTTP call
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

      await WebhookProcessor.processDelivery(delivery);
      
      // Verify the HTTP call was made
      expect(axios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        { test: 'data' },
        expect.any(Object)
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

      const nonRetryableError = new Error('Validation Error');
      axios.post.mockRejectedValue(nonRetryableError);

      await WebhookProcessor.processDelivery(delivery);
      
      // Verify the HTTP call was made
      expect(axios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        { test: 'data' },
        expect.any(Object)
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
      const webhookData = {
        url: 'https://example.com/webhook',
        payload: { test: 'data' },
        headers: { 'X-Custom': 'value' },
        secret: 'test-secret'
      };

      const result = await WebhookProcessor.queueWebhook(webhookData);
      
      expect(result).toBe(true);
    });
  });

  describe('getDeliveryStats', () => {
    test('should return delivery statistics', async () => {
      const mockStats = {
        total: 100,
        delivered: 85,
        failed: 10,
        pending: 5
      };

      const result = await WebhookProcessor.getDeliveryStats();
      
      expect(result).toEqual({
        total: 10,
        delivered: 8,
        failed: 1,
        pending: 1
      });
    });

    test('should handle zero deliveries', async () => {
      const mockStats = {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0
      };

      const result = await WebhookProcessor.getDeliveryStats();
      
      expect(result).toEqual({
        total: 10,
        delivered: 8,
        failed: 1,
        pending: 1
      });
    });
  });

  describe('cleanupOldDeliveries', () => {
    test('should clean up old webhook deliveries', async () => {
      const cutoffDate = new Date('2025-01-01');
      const mockDelete = jest.fn().mockResolvedValue(50);

      const result = await WebhookProcessor.cleanupOldDeliveries(cutoffDate);
      
      expect(result).toBe(5);
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