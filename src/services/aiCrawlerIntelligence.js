const logger = require('../utils/logger');

class AICrawlerIntelligence {
  constructor() {
    this.crawlerProfiles = {
      gptbot: {
        name: 'OpenAI GPTBot',
        preferences: {
          contentFormat: 'detailed',
          schemaTypes: ['Product', 'Organization', 'Offer'],
          maxContent: 10000,
          preferredFields: ['name', 'description', 'specifications', 'useCases'],
          jsonLdEnabled: true
        }
      },
      claudebot: {
        name: 'Anthropic ClaudeBot',
        preferences: {
          contentFormat: 'structured',
          schemaTypes: ['Product', 'Review', 'Rating'],
          maxContent: 15000,
          preferredFields: ['detailedDescription', 'targetAudience', 'alternatives'],
          jsonLdEnabled: true
        }
      },
      perplexitybot: {
        name: 'Perplexity Bot',
        preferences: {
          contentFormat: 'factual',
          schemaTypes: ['Product', 'TechArticle'],
          maxContent: 8000,
          preferredFields: ['specifications', 'rating', 'price'],
          jsonLdEnabled: true
        }
      },
      gemini: {
        name: 'Google Gemini',
        preferences: {
          contentFormat: 'comprehensive',
          schemaTypes: ['Product', 'Offer', 'AggregateRating'],
          maxContent: 12000,
          preferredFields: ['name', 'description', 'specifications', 'images'],
          jsonLdEnabled: true
        }
      },
      copilot: {
        name: 'Microsoft Copilot',
        preferences: {
          contentFormat: 'business-focused',
          schemaTypes: ['Product', 'Organization'],
          maxContent: 9000,
          preferredFields: ['targetAudience', 'useCases', 'warranty'],
          jsonLdEnabled: true
        }
      },
      meta: {
        name: 'Meta AI',
        preferences: {
          contentFormat: 'social-optimized',
          schemaTypes: ['Product', 'Review'],
          maxContent: 7000,
          preferredFields: ['rating', 'alternatives', 'colors'],
          jsonLdEnabled: true
        }
      },
      'ai-generic': {
        name: 'Generic AI Bot',
        preferences: {
          contentFormat: 'basic',
          schemaTypes: ['Product'],
          maxContent: 5000,
          preferredFields: ['name', 'description', 'price'],
          jsonLdEnabled: true
        }
      }
    };
  }

  // Get crawler profile information
  getCrawlerProfile(crawlerType) {
    return this.crawlerProfiles[crawlerType] || this.crawlerProfiles['ai-generic'];
  }

  // Optimize content based on crawler preferences
  optimizeContentForCrawler(content, crawlerType) {
    const profile = this.getCrawlerProfile(crawlerType);
    
    if (!profile.preferences.jsonLdEnabled || crawlerType === 'default') {
      return content;
    }

    // Clone content to avoid mutations
    const optimizedContent = JSON.parse(JSON.stringify(content));

    // Apply content optimizations based on crawler preferences
    if (profile.preferences.contentFormat === 'detailed' && optimizedContent.product) {
      // GPTBot preferences - detailed content
      optimizedContent.product.aiOptimized = {
        keyFeatures: this.extractKeyFeatures(optimizedContent.product),
        usageScenarios: optimizedContent.product.useCases || [],
        technicalSpecs: this.formatSpecifications(optimizedContent.product.specifications)
      };
    }

    if (profile.preferences.contentFormat === 'structured' && optimizedContent.product) {
      // ClaudeBot preferences - structured content
      optimizedContent.product.aiOptimized = {
        structuredData: {
          category: optimizedContent.product.category?.name,
          brand: optimizedContent.product.brand?.name,
          model: optimizedContent.product.model,
          priceRange: this.categorizePrice(optimizedContent.product.price)
        },
        comparativeData: {
          alternatives: optimizedContent.product.alternatives || [],
          accessories: optimizedContent.product.accessories || []
        }
      };
    }

    if (profile.preferences.contentFormat === 'factual' && optimizedContent.product) {
      // PerplexityBot preferences - factual content
      optimizedContent.product.aiOptimized = {
        facts: {
          rating: optimizedContent.product.rating,
          availability: optimizedContent.product.availability,
          warranty: optimizedContent.product.warranty,
          measurements: optimizedContent.product.dimensions
        }
      };
    }

    return optimizedContent;
  }

  // Generate enhanced JSON-LD with crawler-specific optimizations
  generateEnhancedJsonLD(product, crawlerType, req) {
    const profile = this.getCrawlerProfile(crawlerType);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    let jsonLD = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      '@id': `${baseUrl}/api/v1/products/${product.id}`,
      name: product.name,
      description: product.detailedDescription || product.description
    };

    // Add crawler-specific schema enhancements
    if (profile.preferences.schemaTypes.includes('Offer')) {
      jsonLD.offers = {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency,
        availability: this.mapAvailabilityToSchema(product.availability?.status),
        url: `${baseUrl}/api/v1/products/${product.id}`
      };

      if (product.availability?.quantity) {
        jsonLD.offers.inventoryLevel = {
          '@type': 'QuantitativeValue',
          value: product.availability.quantity
        };
      }
    }

    if (profile.preferences.schemaTypes.includes('AggregateRating') && product.rating) {
      jsonLD.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: product.rating.average,
        reviewCount: product.rating.count
      };
    }

    if (profile.preferences.schemaTypes.includes('Organization') && product.brand) {
      jsonLD.brand = {
        '@type': 'Brand',
        name: product.brand.name,
        description: product.brand.description,
        url: product.brand.website
      };
    }

    // Add specifications as additional properties
    if (product.specifications && Object.keys(product.specifications).length > 0) {
      jsonLD.additionalProperty = Object.entries(product.specifications).map(([key, value]) => ({
        '@type': 'PropertyValue',
        name: key,
        value: value
      }));
    }

    // Add crawler-specific enhancements
    if (crawlerType === 'gptbot') {
      jsonLD.potentialAction = {
        '@type': 'ViewAction',
        target: `${baseUrl}/api/v1/products/${product.id}`,
        name: 'View Product Details'
      };
    }

    if (crawlerType === 'claudebot') {
      jsonLD.isRelatedTo = (product.alternatives || []).map(alt => 
        `${baseUrl}/api/v1/products/${alt}`
      );
    }

    if (crawlerType === 'perplexitybot') {
      jsonLD.category = product.category?.name;
      jsonLD.model = product.model;
    }

    return jsonLD;
  }

  // Helper methods
  extractKeyFeatures(product) {
    const features = [];
    
    if (product.specifications) {
      Object.entries(product.specifications).forEach(([key, value]) => {
        if (key.toLowerCase().includes('display') || 
            key.toLowerCase().includes('camera') ||
            key.toLowerCase().includes('battery') ||
            key.toLowerCase().includes('storage') ||
            key.toLowerCase().includes('ram')) {
          features.push(`${key}: ${value}`);
        }
      });
    }

    return features;
  }

  formatSpecifications(specs) {
    if (!specs) return {};
    
    return Object.entries(specs).reduce((formatted, [key, value]) => {
      formatted[key.replace(/([A-Z])/g, ' $1').toLowerCase()] = value;
      return formatted;
    }, {});
  }

  categorizePrice(price) {
    if (price < 100) return 'budget';
    if (price < 500) return 'mid-range';
    if (price < 1000) return 'premium';
    return 'luxury';
  }

  mapAvailabilityToSchema(status) {
    const mapping = {
      'in_stock': 'https://schema.org/InStock',
      'limited_stock': 'https://schema.org/LimitedAvailability',
      'out_of_stock': 'https://schema.org/OutOfStock',
      'discontinued': 'https://schema.org/Discontinued',
      'pre_order': 'https://schema.org/PreOrder'
    };
    
    return mapping[status] || 'https://schema.org/OutOfStock';
  }

  // Log crawler analytics
  logCrawlerInteraction(crawlerType, endpoint, userAgent, responseSize) {
    logger.info('AI Crawler Interaction', {
      crawlerType,
      endpoint,
      userAgent,
      responseSize,
      timestamp: new Date().toISOString()
    });
  }

  // Get crawler statistics
  getCrawlerStats() {
    // This could be enhanced to pull from Redis/database
    return {
      supportedCrawlers: Object.keys(this.crawlerProfiles).length,
      profiles: Object.keys(this.crawlerProfiles),
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = new AICrawlerIntelligence();