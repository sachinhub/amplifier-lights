const request = require('supertest');
const Application = require('../src/app');

describe('Products API', () => {
  let app;

  beforeAll(() => {
    const application = new Application();
    app = application.getApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/products', () => {

    test('should return products list', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    test('should handle query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/products?category=electronics&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('filters');
      expect(response.body.filters).toMatchObject({
        category: 'electronics',
        limit: 10
      });
    });

    test('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/v1/products?limit=2000')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
    });
  });

  describe('GET /api/v1/products/search', () => {
    test('should search products', async () => {
      const response = await request(app)
        .get('/api/v1/products/search?q=laptop')
        .expect(200);

      expect(response.body).toHaveProperty('query', 'laptop');
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    test('should return 400 for missing query', async () => {
      const response = await request(app)
        .get('/api/v1/products/search')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    test('should return 400 for short query', async () => {
      const response = await request(app)
        .get('/api/v1/products/search?q=a')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
    });
  });

  describe('GET /api/v1/products/compare', () => {
    test('should compare products', async () => {
      const response = await request(app)
        .get('/api/v1/products/compare?ids=1,2,3')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('comparison');
    });

    test('should return 400 for missing IDs', async () => {
      const response = await request(app)
        .get('/api/v1/products/compare')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    test('should return 400 for too few IDs', async () => {
      const response = await request(app)
        .get('/api/v1/products/compare?ids=1')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Bad Request');
    });
  });

  describe('GET /api/v1/products/:id', () => {
    test('should return specific product', async () => {
      const response = await request(app)
        .get('/api/v1/products/test-product-1')
        .expect(200);

      expect(response.body).toHaveProperty('product');
    });

    test('should return 404 for non-existent product', async () => {
      const Product = require('../src/models/Product');
      Product.findById.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/v1/products/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });

  describe('AI Crawler Integration', () => {
    test('should include JSON-LD for AI crawlers', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .set('User-Agent', 'GPTBot/1.0')
        .expect(200);

      // Should include JSON-LD when AI crawler is detected
      if (response.body.products.length > 0) {
        expect(response.body).toHaveProperty('jsonLD');
      }
    });

    test('should not include JSON-LD for regular browsers', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        .expect(200);

      expect(response.body).not.toHaveProperty('jsonLD');
    });
  });

  describe('Categories API', () => {
    test('should return categories', async () => {
      const response = await request(app)
        .get('/api/v1/categories')
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });
  });
});