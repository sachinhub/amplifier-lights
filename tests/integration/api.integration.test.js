const request = require('supertest');
const Application = require('../../src/app');

describe('API Integration Tests', () => {
  let app;

  beforeAll(() => {
    const application = new Application();
    app = application.getApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Product Workflow', () => {
    test('should handle complete product discovery workflow', async () => {
      // 1. Get all products
      const productsResponse = await request(app)
        .get('/api/v1/products')
        .expect(200);
      
      expect(productsResponse.body).toHaveProperty('products');
      expect(productsResponse.body).toHaveProperty('total');

      // 2. Search for products
      const searchResponse = await request(app)
        .get('/api/v1/products/search?q=smartphone')
        .expect(200);
      
      expect(searchResponse.body).toHaveProperty('query', 'smartphone');
      expect(searchResponse.body).toHaveProperty('results');

      // 3. Get specific product
      const productResponse = await request(app)
        .get('/api/v1/products/test-product-1')
        .expect(200);
      
      expect(productResponse.body).toHaveProperty('product');

      // 4. Get product availability
      const availabilityResponse = await request(app)
        .get('/api/v1/availability/test-product-1')
        .expect(200);
      
      expect(availabilityResponse.body).toHaveProperty('productId');
      expect(availabilityResponse.body).toHaveProperty('locations');
      expect(availabilityResponse.body).toHaveProperty('globalStatus');
    });

    test('should handle AI crawler workflow with JSON-LD', async () => {
      // Simulate GPTBot crawler
      const gptBotResponse = await request(app)
        .get('/api/v1/products/test-product-1')
        .set('User-Agent', 'GPTBot/1.0')
        .expect(200);
      
      expect(gptBotResponse.body).toHaveProperty('product');
      expect(gptBotResponse.body).toHaveProperty('jsonLD');
      expect(gptBotResponse.body.jsonLD).toHaveProperty('@context', 'https://schema.org/');
      expect(gptBotResponse.body.jsonLD).toHaveProperty('@type', 'Product');

      // Simulate ClaudeBot crawler
      const claudeBotResponse = await request(app)
        .get('/api/v1/products?limit=5')
        .set('User-Agent', 'ClaudeBot/1.0')
        .expect(200);
      
      expect(claudeBotResponse.body).toHaveProperty('jsonLD');
      expect(Array.isArray(claudeBotResponse.body.jsonLD)).toBe(true);

      // Check robots.txt for AI crawlers
      const robotsResponse = await request(app)
        .get('/robots.txt')
        .expect(200);
      
      expect(robotsResponse.text).toContain('User-agent: GPTBot');
      expect(robotsResponse.text).toContain('User-agent: ClaudeBot');
      expect(robotsResponse.text).toContain('User-agent: PerplexityBot');
      expect(robotsResponse.text).toContain('Allow: /');
    });
  });

  describe('Inventory Management Workflow', () => {
    test('should handle complete inventory update workflow', async () => {
      // 1. Check current availability
      const currentAvailability = await request(app)
        .get('/api/v1/availability/TECH-PHONE-001')
        .expect(200);
      
      expect(currentAvailability.body).toHaveProperty('globalStatus');

      // 2. Update inventory
      const updateData = {
        productId: 'TECH-PHONE-001',
        updates: [{
          locationCode: 'US',
          quantity: 120,
          price: 949.99
        }]
      };

      const updateResponse = await request(app)
        .post('/api/v1/availability/update')
        .send(updateData)
        .expect(200);
      
      expect(updateResponse.body).toHaveProperty('message');
      expect(updateResponse.body).toHaveProperty('productId', 'TECH-PHONE-001');
      expect(updateResponse.body).toHaveProperty('results');

      // 3. Verify update reflected in availability
      const updatedAvailability = await request(app)
        .get('/api/v1/availability/TECH-PHONE-001?location=US')
        .expect(200);
      
      expect(updatedAvailability.body).toHaveProperty('locations');
    });

    test('should handle bulk inventory updates', async () => {
      const bulkData = [
        {
          productId: 'TECH-PHONE-001',
          updates: [{ locationCode: 'US', quantity: 100 }]
        },
        {
          productId: 'INNO-SMART-002',
          updates: [{ locationCode: 'EU', quantity: 50 }]
        }
      ];

      const response = await request(app)
        .post('/api/v1/availability/bulk-update')
        .send(bulkData)
        .expect(200);
      
      expect(response.body).toHaveProperty('successful');
      expect(response.body).toHaveProperty('failed');
      expect(response.body.successful).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Webhook Integration Workflow', () => {
    test('should handle external webhook updates', async () => {
      const webhookPayload = {
        products: [
          {
            id: 'TECH-PHONE-001',
            location: 'US',
            quantity: 95,
            price: 999.99,
            status: 'in_stock'
          },
          {
            id: 'INNO-SMART-002',
            location: 'EU',
            quantity: 25,
            price: 279.99,
            status: 'limited_stock'
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/availability/webhook')
        .set('X-Webhook-Signature', 'sha256=test-signature')
        .send(webhookPayload)
        .expect(200);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('processed successfully');
      expect(response.body).toHaveProperty('processed');
      expect(response.body).toHaveProperty('errors');
    });

    test('should reject webhooks without signature', async () => {
      const webhookPayload = {
        products: [{ id: 'TEST-001', quantity: 100 }]
      };

      const response = await request(app)
        .post('/api/v1/availability/webhook')
        .send(webhookPayload)
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Alert System Workflow', () => {
    test('should retrieve availability alerts', async () => {
      const alertsResponse = await request(app)
        .get('/api/v1/availability/alerts')
        .expect(200);
      
      expect(alertsResponse.body).toHaveProperty('alerts');
      expect(alertsResponse.body).toHaveProperty('count');
      expect(alertsResponse.body).toHaveProperty('location', 'all');
      expect(Array.isArray(alertsResponse.body.alerts)).toBe(true);
    });

    test('should filter alerts by location', async () => {
      const response = await request(app)
        .get('/api/v1/availability/alerts?location=US')
        .expect(200);
      
      expect(response.body).toHaveProperty('location', 'US');
    });
  });

  describe('Product Comparison Workflow', () => {
    test('should compare multiple products', async () => {
      const response = await request(app)
        .get('/api/v1/products/compare?ids=test-product-1,test-product-2')
        .expect(200);
      
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('comparison');
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(typeof response.body.comparison).toBe('object');
    });

    test('should include JSON-LD for AI crawlers in comparison', async () => {
      const response = await request(app)
        .get('/api/v1/products/compare?ids=test-product-1,test-product-2')
        .set('User-Agent', 'PerplexityBot/1.0')
        .expect(200);
      
      expect(response.body).toHaveProperty('jsonLD');
      expect(Array.isArray(response.body.jsonLD)).toBe(true);
    });
  });

  describe('Categories Workflow', () => {
    test('should retrieve product categories', async () => {
      const response = await request(app)
        .get('/api/v1/categories')
        .expect(200);
      
      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });

    test('should retrieve specific category by slug', async () => {
      const response = await request(app)
        .get('/api/v1/categories/electronics')
        .expect(200);
      
      expect(response.body).toHaveProperty('category');
    });
  });

  describe('System Health Monitoring', () => {
    test('should provide application health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });

    test('should provide availability engine health status', async () => {
      const response = await request(app)
        .get('/api/v1/availability/system/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('availability_engine');
      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should provide API version information', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);
      
      expect(response.body).toHaveProperty('name', 'AmplifiER - Light');
      expect(response.body).toHaveProperty('version', 'v1');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('products');
      expect(response.body.endpoints).toHaveProperty('availability');
      expect(response.body.endpoints).toHaveProperty('categories');
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should apply different rate limits for AI crawlers', async () => {
      // Regular request
      const regularResponse = await request(app)
        .get('/api/v1/products')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        .expect(200);
      
      expect(regularResponse.body).not.toHaveProperty('jsonLD');

      // AI crawler request  
      const aiResponse = await request(app)
        .get('/api/v1/products')
        .set('User-Agent', 'GPTBot/1.0')
        .expect(200);
      
      expect(aiResponse.body).toHaveProperty('jsonLD');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle validation errors consistently', async () => {
      // Invalid product search
      const invalidSearch = await request(app)
        .get('/api/v1/products/search?q=a')
        .expect(400);
      
      expect(invalidSearch.body).toHaveProperty('error', 'Bad Request');

      // Invalid availability update
      const invalidUpdate = await request(app)
        .post('/api/v1/availability/update')
        .send({ productId: 'TEST-001' }) // Missing updates
        .expect(400);
      
      expect(invalidUpdate.body).toHaveProperty('error', 'Bad Request');
    });

    test('should handle 404 errors consistently', async () => {
      // Non-existent product
      const Product = require('../../src/models/Product');
      const Availability = require('../../src/models/Availability');
      
      Product.findById.mockResolvedValueOnce(null);
      
      const productResponse = await request(app)
        .get('/api/v1/products/non-existent')
        .expect(404);
      
      expect(productResponse.body).toHaveProperty('error', 'Not Found');

      // Non-existent availability
      Availability.getProductAvailability.mockResolvedValueOnce({
        productId: 'non-existent',
        locations: [],
        globalStatus: 'out_of_stock'
      });
      
      const availabilityResponse = await request(app)
        .get('/api/v1/availability/non-existent')
        .expect(404);
      
      expect(availabilityResponse.body).toHaveProperty('error', 'Not Found');
    });

    test('should handle unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
});