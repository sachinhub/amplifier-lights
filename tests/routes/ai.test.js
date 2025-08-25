const request = require('supertest');
const Application = require('../../src/app');
const aiCrawler = require('../../src/services/aiCrawlerIntelligence');
const rateLimiter = require('../../src/middleware/rateLimiter');

// Mock the AI crawler service
jest.mock('../../src/services/aiCrawlerIntelligence');
jest.mock('../../src/middleware/rateLimiter');

describe('AI Routes', () => {
  let app;

  beforeAll(() => {
    const application = new Application();
    app = application.getApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AI crawler service methods
    aiCrawler.getCrawlerStats.mockReturnValue({
      totalRequests: 1500,
      crawlerBreakdown: {
        gptbot: 450,
        claudebot: 320,
        perplexitybot: 280,
        gemini: 200,
        copilot: 150,
        meta: 80,
        'ai-generic': 20
      },
      averageResponseTime: 245,
      contentOptimizations: 1200,
      jsonLdGenerations: 800
    });

    aiCrawler.crawlerProfiles = {
      gptbot: { name: 'GPTBot', preferences: ['detailed', 'structured', 'contextual'] },
      claudebot: { name: 'ClaudeBot', preferences: ['concise', 'factual', 'analytical'] },
      perplexitybot: { name: 'PerplexityBot', preferences: ['comprehensive', 'searchable', 'up-to-date'] },
      gemini: { name: 'Gemini', preferences: ['visual', 'interactive', 'creative'] },
      copilot: { name: 'Copilot', preferences: ['practical', 'actionable', 'user-focused'] },
      meta: { name: 'Meta AI', preferences: ['social', 'engaging', 'trending'] },
      'ai-generic': { name: 'Generic AI', preferences: ['standard', 'accessible', 'universal'] }
    };

    aiCrawler.getCrawlerProfile.mockImplementation((crawlerType) => {
      return aiCrawler.crawlerProfiles[crawlerType] || { name: 'Default', preferences: ['basic'] };
    });

    aiCrawler.optimizeContentForCrawler.mockImplementation((content, crawlerType) => {
      const profile = aiCrawler.getCrawlerProfile(crawlerType);
      return {
        ...content,
        optimized: true,
        crawlerType,
        optimizationNotes: `Content optimized for ${profile.name}`,
        enhancedFeatures: profile.preferences
      };
    });

    // Mock rate limiter
    rateLimiter.detectCrawler.mockImplementation((userAgent) => {
      if (!userAgent) return 'default';
      
      const ua = userAgent.toLowerCase();
      
      // OpenAI/ChatGPT crawlers
      if (ua.includes('gptbot') || ua.includes('oai-searchbot') || 
          ua.includes('chatgpt-user') || ua.includes('openai') ||
          ua.includes('gpt-4') || ua.includes('gpt-3.5')) {
        return 'gptbot';
      }
      
      // Anthropic/Claude crawlers
      if (ua.includes('claudebot') || ua.includes('anthropic-ai') || 
          ua.includes('claude-web') || ua.includes('claude/') ||
          ua.includes('anthropic')) {
        return 'claudebot';
      }
      
      // Perplexity crawlers
      if (ua.includes('perplexitybot') || ua.includes('perplexity') ||
          ua.includes('pplx')) {
        return 'perplexitybot';
      }
      
      // Other AI platforms
      if (ua.includes('bard') || ua.includes('gemini') || ua.includes('google-ai')) {
        return 'gemini';
      }
      
      if (ua.includes('bing') && (ua.includes('chat') || ua.includes('copilot'))) {
        return 'copilot';
      }
      
      if (ua.includes('meta-ai') || ua.includes('llama') || ua.includes('facebook-ai')) {
        return 'meta';
      }
      
      // Generic AI detection patterns
      if (ua.includes('ai-bot') || ua.includes('aibot') || ua.includes('llm') ||
          ua.includes('language-model') || ua.includes('assistant') ||
          (ua.includes('bot') && (ua.includes('ai') || ua.includes('ml')))) {
        return 'ai-generic';
      }
      
      return 'default';
    });
  });

  describe('GET /ai/crawler-stats', () => {
    test('should return AI crawler statistics and profiles', async () => {
      const response = await request(app)
        .get('/api/v1/ai/crawler-stats')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('rateLimits');
      expect(response.body).toHaveProperty('features');

      // Check stats structure
      expect(response.body.stats).toHaveProperty('totalRequests');
      expect(response.body.stats).toHaveProperty('crawlerBreakdown');
      expect(response.body.stats).toHaveProperty('averageResponseTime');

      // Check rate limits
      expect(response.body.rateLimits).toEqual({
        gptbot: 200,
        claudebot: 200,
        perplexitybot: 200,
        gemini: 150,
        copilot: 120,
        meta: 100,
        'ai-generic': 80
      });

      // Check features
      expect(response.body.features).toEqual({
        userAgentDetection: true,
        contentOptimization: true,
        jsonLdGeneration: true,
        sitemapGeneration: true,
        crawlAnalytics: true
      });

      // Verify service calls
      expect(aiCrawler.getCrawlerStats).toHaveBeenCalledTimes(1);
      expect(aiCrawler.getCrawlerProfile).toHaveBeenCalledTimes(7); // Once for each crawler type
    });

    test('should handle errors gracefully', async () => {
      // Mock service to throw error
      aiCrawler.getCrawlerStats.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .get('/api/v1/ai/crawler-stats')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal Server Error');
      expect(response.body).toHaveProperty('message', 'Failed to get crawler statistics');
    });
  });

  describe('GET /ai/detect', () => {
    test('should detect GPTBot user agent correctly', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'GPTBot/1.0; +https://openai.com/bot')
        .expect(200);

      expect(response.body).toHaveProperty('userAgent', 'GPTBot/1.0; +https://openai.com/bot');
      expect(response.body).toHaveProperty('detectedType', 'gptbot');
      expect(response.body).toHaveProperty('isAICrawler', true);
      expect(response.body).toHaveProperty('profile');
      expect(response.body.profile.name).toBe('GPTBot');

      expect(rateLimiter.detectCrawler).toHaveBeenCalledWith('GPTBot/1.0; +https://openai.com/bot');
      expect(aiCrawler.getCrawlerProfile).toHaveBeenCalledWith('gptbot');
    });

    test('should detect ClaudeBot user agent correctly', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'ClaudeBot/1.0; +https://anthropic.com/bot')
        .expect(200);

      expect(response.body.detectedType).toBe('claudebot');
      expect(response.body.isAICrawler).toBe(true);
      expect(response.body.profile.name).toBe('ClaudeBot');
    });

    test('should detect PerplexityBot user agent correctly', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'PerplexityBot/1.0; +https://perplexity.ai/bot')
        .expect(200);

      expect(response.body.detectedType).toBe('perplexitybot');
      expect(response.body.isAICrawler).toBe(true);
      expect(response.body.profile.name).toBe('PerplexityBot');
    });

    test('should detect Gemini user agent correctly', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'Mozilla/5.0 (compatible; Gemini/1.0; +https://gemini.google.com/bot)')
        .expect(200);

      expect(response.body.detectedType).toBe('gemini');
      expect(response.body.isAICrawler).toBe(true);
      expect(response.body.profile.name).toBe('Gemini');
    });

    test('should detect Copilot user agent correctly', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'Mozilla/5.0 (compatible; Bingbot/2.0; +https://bing.com/bot; copilot)')
        .expect(200);

      expect(response.body.detectedType).toBe('copilot');
      expect(response.body.isAICrawler).toBe(true);
      expect(response.body.profile.name).toBe('Copilot');
    });

    test('should detect Meta AI user agent correctly', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'Mozilla/5.0 (compatible; MetaAI/1.0; +https://meta.ai/bot; meta-ai)')
        .expect(200);

      expect(response.body.detectedType).toBe('meta');
      expect(response.body.isAICrawler).toBe(true);
      expect(response.body.profile.name).toBe('Meta AI');
    });

    test('should detect generic AI bot user agent correctly', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'AI-Bot/1.0; +https://example.com/bot')
        .expect(200);

      expect(response.body.detectedType).toBe('ai-generic');
      expect(response.body.isAICrawler).toBe(true);
      expect(response.body.profile.name).toBe('Generic AI');
    });

    test('should detect regular browser as default', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        .expect(200);

      expect(response.body.detectedType).toBe('default');
      expect(response.body.isAICrawler).toBe(false);
      expect(response.body.profile.name).toBe('Default');
    });

    test('should handle missing user agent', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .expect(200);

      expect(response.body).toHaveProperty('detectedType', 'default');
      expect(response.body).toHaveProperty('isAICrawler', false);
      expect(response.body).toHaveProperty('profile');
      expect(response.body.profile.name).toBe('Default');
    });
  });

  describe('GET /ai/optimize', () => {
    test('should optimize content for GPTBot', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'GPTBot/1.0')
        .expect(200);

      expect(response.body).toHaveProperty('crawlerType');
      expect(response.body).toHaveProperty('original');
      expect(response.body).toHaveProperty('optimized');
      expect(response.body).toHaveProperty('profile');

      // Check original content structure
      expect(response.body.original.product).toHaveProperty('name', 'Test Product');
      expect(response.body.original.product).toHaveProperty('description');
      expect(response.body.original.product).toHaveProperty('specifications');
      expect(response.body.original.product).toHaveProperty('price', 599.99);

      // Check profile
      expect(response.body.profile.name).toBe('GPTBot');
      expect(response.body.profile.preferences).toContain('detailed');
      expect(response.body.profile.preferences).toContain('structured');
    });

    test('should optimize content for ClaudeBot', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'ClaudeBot/1.0')
        .expect(200);

      expect(response.body.crawlerType).toBeDefined();
      expect(response.body.profile.name).toBe('ClaudeBot');
      expect(response.body.profile.preferences).toContain('concise');
      expect(response.body.profile.preferences).toContain('factual');
    });

    test('should optimize content for PerplexityBot', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'PerplexityBot/1.0')
        .expect(200);

      expect(response.body.crawlerType).toBeDefined();
      expect(response.body.profile.name).toBe('PerplexityBot');
      expect(response.body.profile.preferences).toContain('comprehensive');
      expect(response.body.profile.preferences).toContain('searchable');
    });

    test('should optimize content for Gemini', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'Gemini/1.0')
        .expect(200);

      expect(response.body.crawlerType).toBeDefined();
      expect(response.body.profile.name).toBe('Gemini');
      expect(response.body.profile.preferences).toContain('visual');
      expect(response.body.profile.preferences).toContain('interactive');
    });

    test('should optimize content for Copilot', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'Mozilla/5.0 (compatible; Bingbot/2.0; +https://bing.com/bot; copilot)')
        .expect(200);

      expect(response.body.crawlerType).toBeDefined();
      expect(response.body.profile.name).toBe('Copilot');
      expect(response.body.profile.preferences).toContain('practical');
      expect(response.body.profile.preferences).toContain('actionable');
    });

    test('should optimize content for Meta AI', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'Mozilla/5.0 (compatible; MetaAI/1.0; +https://meta.ai/bot; meta-ai)')
        .expect(200);

      expect(response.body.crawlerType).toBeDefined();
      expect(response.body.profile.name).toBe('Meta AI');
      expect(response.body.profile.preferences).toContain('social');
      expect(response.body.profile.preferences).toContain('engaging');
    });

    test('should optimize content for generic AI', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'AI-Bot/1.0')
        .expect(200);

      expect(response.body.crawlerType).toBeDefined();
      expect(response.body.profile.name).toBe('Generic AI');
      expect(response.body.profile.preferences).toContain('standard');
      expect(response.body.profile.preferences).toContain('accessible');
    });

    test('should handle default crawler type', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'Mozilla/5.0 (regular browser)')
        .expect(200);

      expect(response.body.crawlerType).toBeDefined();
      expect(response.body.profile.name).toBe('Default');
      expect(response.body.profile.preferences).toContain('basic');
    });

    test('should handle missing crawler type', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .expect(200);

      expect(response.body.crawlerType).toBeDefined();
      expect(response.body.profile.name).toBe('Default');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed user agent strings', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'Invalid/User/Agent/String')
        .expect(200);

      expect(response.body.detectedType).toBe('default');
      expect(response.body.isAICrawler).toBe(false);
    });

    test('should handle very long user agent strings', async () => {
      const longUserAgent = 'A'.repeat(1000);
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', longUserAgent)
        .expect(200);

      expect(response.body.userAgent).toBe(longUserAgent);
      expect(response.body.detectedType).toBe('default');
    });

    test('should handle special characters in user agent', async () => {
      const specialUserAgent = 'GPTBot/1.0; +https://openai.com/bot; charset=utf-8; lang=en-US';
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', specialUserAgent)
        .expect(200);

      expect(response.body.detectedType).toBe('gptbot');
      expect(response.body.isAICrawler).toBe(true);
    });

    test('should handle case-insensitive detection', async () => {
      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'gptbot/1.0')
        .expect(200);

      expect(response.body.detectedType).toBe('gptbot');
      expect(response.body.isAICrawler).toBe(true);
    });
  });

  describe('Integration with Rate Limiter', () => {
    test('should use rate limiter for crawler detection', async () => {
      await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'GPTBot/1.0')
        .expect(200);

      expect(rateLimiter.detectCrawler).toHaveBeenCalledWith('GPTBot/1.0');
    });

    test('should handle rate limiter errors gracefully', async () => {
      rateLimiter.detectCrawler.mockImplementation(() => {
        throw new Error('Rate limiter error');
      });

      const response = await request(app)
        .get('/api/v1/ai/detect')
        .set('User-Agent', 'GPTBot/1.0')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Content Optimization Quality', () => {
    test('should preserve original content structure', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'GPTBot/1.0')
        .expect(200);

      const original = response.body.original.product;
      const optimized = response.body.optimized;

      // Check that core properties are preserved
      expect(optimized.product.name).toBe(original.name);
      expect(optimized.product.description).toBe(original.description);
      expect(optimized.product.price).toBe(original.price);
      expect(optimized.product.specifications).toEqual(original.specifications);
    });

    test('should add optimization metadata', async () => {
      const response = await request(app)
        .get('/api/v1/ai/optimize')
        .set('User-Agent', 'ClaudeBot/1.0')
        .expect(200);

      const optimized = response.body.optimized;

      expect(optimized).toHaveProperty('optimized', true);
      expect(optimized).toHaveProperty('crawlerType');
      expect(optimized).toHaveProperty('optimizationNotes');
      expect(optimized).toHaveProperty('enhancedFeatures');
      expect(Array.isArray(optimized.enhancedFeatures)).toBe(true);
    });
  });
});
