const express = require('express');
const aiCrawler = require('../services/aiCrawlerIntelligence');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// GET /ai/crawler-stats - Get AI crawler statistics and profiles
router.get('/crawler-stats', (req, res) => {
  try {
    const stats = aiCrawler.getCrawlerStats();
    const profiles = {};
    
    // Get detailed profiles for each crawler type
    Object.keys(aiCrawler.crawlerProfiles).forEach(crawlerType => {
      profiles[crawlerType] = aiCrawler.getCrawlerProfile(crawlerType);
    });
    
    res.json({
      stats,
      profiles,
      rateLimits: {
        gptbot: 200,
        claudebot: 200,
        perplexitybot: 200,
        gemini: 150,
        copilot: 120,
        meta: 100,
        'ai-generic': 80
      },
      features: {
        userAgentDetection: true,
        contentOptimization: true,
        jsonLdGeneration: true,
        sitemapGeneration: true,
        crawlAnalytics: true
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get crawler statistics'
    });
  }
});

// GET /ai/detect - Test user agent detection
router.get('/detect', (req, res) => {
  const userAgent = req.get('User-Agent');
  const crawlerType = rateLimiter.detectCrawler(userAgent);
  const profile = aiCrawler.getCrawlerProfile(crawlerType);
  
  res.json({
    userAgent,
    detectedType: crawlerType,
    isAICrawler: crawlerType !== 'default',
    profile
  });
});

// GET /ai/optimize - Test content optimization
router.get('/optimize', (req, res) => {
  const crawlerType = req.crawlerType || 'default';
  
  const sampleContent = {
    product: {
      name: 'Test Product',
      description: 'A sample product for testing AI optimization',
      specifications: {
        display: '6.1" OLED',
        camera: '12MP dual',
        storage: '128GB'
      },
      price: 599.99,
      rating: { average: 4.5, count: 1250 },
      useCases: ['photography', 'gaming', 'productivity']
    }
  };
  
  const optimizedContent = aiCrawler.optimizeContentForCrawler(sampleContent, crawlerType);
  
  res.json({
    crawlerType,
    original: sampleContent,
    optimized: optimizedContent,
    profile: aiCrawler.getCrawlerProfile(crawlerType)
  });
});

module.exports = router;