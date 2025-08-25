const request = require('supertest');
const Application = require('../src/app');

describe('Availability API', () => {
  let app;

  beforeAll(() => {
    const application = new Application();
    app = application.getApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/availability/:productId', () => {
    test('should return product availability', async () => {
      const response = await request(app)
        .get('/api/v1/availability/TECH-PHONE-001')
        .expect(200);

      expect(response.body).toHaveProperty('productId', 'TECH-PHONE-001');
      expect(response.body).toHaveProperty('locations');
      expect(response.body).toHaveProperty('globalStatus');
      expect(response.body).toHaveProperty('lastUpdated');
      expect(Array.isArray(response.body.locations)).toBe(true);
    });

    test('should return 404 for non-existent product', async () => {
      // Mock availability model to return empty locations
      const Availability = require('../src/models/Availability');
      jest.spyOn(Availability, 'getProductAvailability').mockResolvedValueOnce({
        productId: 'non-existent',
        locations: [],
        lastUpdated: new Date().toISOString(),
        globalStatus: 'out_of_stock'
      });

      const response = await request(app)
        .get('/api/v1/availability/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    test('should handle location filtering', async () => {
      const response = await request(app)
        .get('/api/v1/availability/TECH-PHONE-001?location=US')
        .expect(200);

      expect(response.body).toHaveProperty('productId', 'TECH-PHONE-001');
    });
  });

  describe('GET /api/v1/availability', () => {
    test('should return bulk availability', async () => {
      const response = await request(app)
        .get('/api/v1/availability?ids=TECH-PHONE-001,INNO-SMART-002')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('requestedCount', 2);
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.products).toBe('object');
    });

    test('should return 400 when no IDs provided', async () => {
      const response = await request(app)
        .get('/api/v1/availability')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body.message).toContain('Product IDs are required');
    });

    test('should return 400 for too many products', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `product-${i}`).join(',');
      
      const response = await request(app)
        .get(`/api/v1/availability?ids=${tooManyIds}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body.message).toContain('Maximum 100 products');
    });
  });

  describe('POST /api/v1/availability/update', () => {
    test('should update inventory successfully', async () => {
      const updateData = {
        productId: 'TECH-PHONE-001',
        updates: [{
          locationCode: 'US',
          quantity: 100,
          price: 999.99
        }]
      };

      const response = await request(app)
        .post('/api/v1/availability/update')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('productId', 'TECH-PHONE-001');
      expect(response.body).toHaveProperty('updates');
      expect(response.body).toHaveProperty('results');
    });

    test('should return 400 for invalid update data', async () => {
      const invalidData = {
        productId: 'TECH-PHONE-001',
        updates: [] // Empty updates array
      };

      const response = await request(app)
        .post('/api/v1/availability/update')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    test('should return 400 for missing productId', async () => {
      const invalidData = {
        updates: [{
          locationCode: 'US',
          quantity: 100
        }]
      };

      const response = await request(app)
        .post('/api/v1/availability/update')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
    });
  });

  describe('POST /api/v1/availability/bulk-update', () => {
    test('should handle bulk updates successfully', async () => {
      const bulkData = [
        {
          productId: 'TECH-PHONE-001',
          updates: [{
            locationCode: 'US',
            quantity: 150
          }]
        },
        {
          productId: 'INNO-SMART-002',
          updates: [{
            locationCode: 'EU',
            quantity: 50
          }]
        }
      ];

      const response = await request(app)
        .post('/api/v1/availability/bulk-update')
        .send(bulkData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('successful');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('results');
    });

    test('should return 400 for too many products in bulk update', async () => {
      const tooManyUpdates = Array.from({ length: 101 }, (_, i) => ({
        productId: `product-${i}`,
        updates: [{ quantity: 100 }]
      }));

      const response = await request(app)
        .post('/api/v1/availability/bulk-update')
        .send(tooManyUpdates)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body.message).toContain('Maximum 100 products');
    });
  });

  describe('GET /api/v1/availability/alerts', () => {
    test('should return availability alerts', async () => {
      const response = await request(app)
        .get('/api/v1/availability/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('location', 'all');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });

    test('should handle location filtering for alerts', async () => {
      const response = await request(app)
        .get('/api/v1/availability/alerts?location=US')
        .expect(200);

      expect(response.body).toHaveProperty('location', 'US');
    });
  });

  describe('POST /api/v1/availability/webhook', () => {
    test('should process webhook payload successfully', async () => {
      const webhookPayload = {
        products: [
          {
            id: 'TECH-PHONE-001',
            location: 'US',
            quantity: 140,
            price: 999.99
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
    });

    test('should return 401 for missing webhook signature', async () => {
      const webhookPayload = {
        products: [
          {
            id: 'TECH-PHONE-001',
            quantity: 140
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/availability/webhook')
        .send(webhookPayload)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body.message).toContain('Missing webhook signature');
    });

    test('should return 400 for invalid webhook payload', async () => {
      const invalidPayload = {
        invalid: 'data'
      };

      const response = await request(app)
        .post('/api/v1/availability/webhook')
        .set('X-Webhook-Signature', 'sha256=test-signature')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body.message).toContain('Products array is required');
    });
  });

  describe('GET /api/v1/availability/system/status', () => {
    test('should return system status', async () => {
      const response = await request(app)
        .get('/api/v1/availability/system/status')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('availability_engine');
      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('database');
    });
  });
});