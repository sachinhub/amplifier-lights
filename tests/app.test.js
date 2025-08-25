const request = require('supertest');
const Application = require('../src/app');

describe('AmplifiER - Light Application', () => {
  let app;

  beforeAll(() => {
    const application = new Application();
    app = application.getApp();
  });

  describe('Health Check', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API Version', () => {
    test('GET /api/v1 should return API info', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'AmplifiER - Light');
      expect(response.body).toHaveProperty('version', 'v1');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Robots.txt', () => {
    test('GET /robots.txt should return AI crawler permissions', async () => {
      const response = await request(app)
        .get('/robots.txt')
        .expect(200);

      expect(response.text).toContain('User-agent: GPTBot');
      expect(response.text).toContain('User-agent: ClaudeBot');
      expect(response.text).toContain('User-agent: PerplexityBot');
      expect(response.text).toContain('Allow: /');
    });
  });

  describe('Rate Limiting', () => {
    test('Should detect AI crawlers correctly', () => {
      const rateLimiter = require('../src/middleware/rateLimiter');
      
      expect(rateLimiter.detectCrawler('GPTBot/1.0')).toBe('gptbot');
      expect(rateLimiter.detectCrawler('ClaudeBot/1.0')).toBe('claudebot');
      expect(rateLimiter.detectCrawler('PerplexityBot/1.0')).toBe('perplexitybot');
      expect(rateLimiter.detectCrawler('Mozilla/5.0')).toBe('default');
    });
  });

  describe('404 Handler', () => {
    test('Should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
});