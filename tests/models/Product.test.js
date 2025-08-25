const Product = require('../../src/models/Product');

// Mock the database
jest.mock('../../src/config/database');
const db = require('../../src/config/database');

describe('Product Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    test('should return all products with basic query', async () => {
      const mockProducts = [
        {
          id: 1,
          product_id: 'TEST-001',
          name: 'Test Product',
          price: 99.99,
          brand_name: 'Test Brand',
          category_name: 'Test Category'
        }
      ];

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue(mockProducts)
      });

      const result = await Product.findAll();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should apply filters correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([])
      };

      db.mockReturnValue(mockQuery);

      await Product.findAll({
        category: 'electronics',
        brand: 'apple',
        featured: true,
        limit: 10,
        offset: 20
      });

      expect(mockQuery.where).toHaveBeenCalledWith('categories.slug', 'electronics');
      expect(mockQuery.where).toHaveBeenCalledWith('brands.name', 'ilike', '%apple%');
      expect(mockQuery.where).toHaveBeenCalledWith('products.featured', true);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.offset).toHaveBeenCalledWith(20);
    });
  });

  describe('findById', () => {
    test('should find product by numeric ID', async () => {
      const mockProduct = {
        id: 1,
        product_id: 'TEST-001',
        name: 'Test Product',
        price: 99.99
      };

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockProduct)
      });

      const result = await Product.findById(1);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('TEST-001');
    });

    test('should find product by product_id string', async () => {
      const mockProduct = {
        id: 1,
        product_id: 'TEST-001',
        name: 'Test Product'
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockProduct)
      };

      db.mockReturnValue(mockQuery);

      await Product.findById('TEST-001');
      
      expect(mockQuery.where).toHaveBeenCalledWith('products.product_id', 'TEST-001');
    });

    test('should return null for non-existent product', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const result = await Product.findById('NON-EXISTENT');
      
      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    test('should search products with query', async () => {
      const mockProducts = [
        { id: 1, product_id: 'PHONE-001', name: 'iPhone 15' }
      ];

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderByRaw: jest.fn().mockResolvedValue(mockProducts)
      });

      const result = await Product.search('iPhone');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should apply search limit', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderByRaw: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      db.mockReturnValue(mockQuery);

      await Product.search('test', { limit: 5 });
      
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('transformProduct', () => {
    test('should transform database product to API format', () => {
      const dbProduct = {
        id: 1,
        product_id: 'TEST-001',
        name: 'Test Product',
        short_description: 'A test product',
        price: 99.99,
        currency: 'USD',
        availability_status: 'in_stock',
        stock_quantity: 100,
        brand_name: 'Test Brand',
        category_name: 'Electronics',
        avg_rating: 4.5,
        review_count: 123,
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = Product.transformProduct(dbProduct);
      
      expect(result.id).toBe('TEST-001');
      expect(result.name).toBe('Test Product');
      expect(result.price).toBe(99.99);
      expect(result.availability.status).toBe('in_stock');
      expect(result.availability.quantity).toBe(100);
      expect(result.brand.name).toBe('Test Brand');
      expect(result.category.name).toBe('Electronics');
      expect(result.rating.average).toBe(4.5);
      expect(result.rating.count).toBe(123);
    });

    test('should handle null input', () => {
      const result = Product.transformProduct(null);
      expect(result).toBeNull();
    });
  });

  describe('generateJsonLD', () => {
    test('should generate valid JSON-LD schema', async () => {
      const product = {
        id: 'TEST-001',
        name: 'Test Product',
        description: 'A test product',
        detailedDescription: 'Detailed test product description',
        images: ['https://example.com/image.jpg'],
        brand: { name: 'Test Brand', description: 'Test brand' },
        category: { name: 'Electronics' },
        price: 99.99,
        currency: 'USD',
        availability: { status: 'in_stock', quantity: 100 },
        rating: { average: 4.5, count: 123 },
        specifications: { color: 'Blue', size: 'Large' },
        alternatives: ['ALT-001'],
        accessories: ['ACC-001']
      };

      const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('api.example.com')
      };

      const result = await Product.generateJsonLD(product, req);
      
      expect(result['@context']).toBe('https://schema.org/');
      expect(result['@type']).toBe('Product');
      expect(result.name).toBe('Test Product');
      expect(result.offers.price).toBe(99.99);
      expect(result.offers.availability).toBe('https://schema.org/InStock');
      expect(result.aggregateRating.ratingValue).toBe(4.5);
      expect(Array.isArray(result.additionalProperty)).toBe(true);
    });
  });

  describe('mapAvailabilityToSchema', () => {
    test('should map availability statuses correctly', () => {
      expect(Product.mapAvailabilityToSchema('in_stock')).toBe('https://schema.org/InStock');
      expect(Product.mapAvailabilityToSchema('limited_stock')).toBe('https://schema.org/LimitedAvailability');
      expect(Product.mapAvailabilityToSchema('out_of_stock')).toBe('https://schema.org/OutOfStock');
      expect(Product.mapAvailabilityToSchema('discontinued')).toBe('https://schema.org/Discontinued');
      expect(Product.mapAvailabilityToSchema('unknown')).toBe('https://schema.org/OutOfStock');
    });
  });

  describe('extractSearchTerms', () => {
    test('should extract search terms from content', () => {
      const content = 'iPhone 15 Pro smartphone with amazing camera and battery life!';
      const terms = Product.extractSearchTerms(content);
      
      expect(Array.isArray(terms)).toBe(true);
      expect(terms.includes('iphone')).toBe(true);
      expect(terms.includes('smartphone')).toBe(true);
      expect(terms.includes('camera')).toBe(true);
      expect(terms.includes('battery')).toBe(true);
      expect(terms.includes('pro')).toBe(true);
    });

    test('should filter out short terms', () => {
      const content = 'A big TV is on';
      const terms = Product.extractSearchTerms(content);
      
      expect(terms.includes('big')).toBe(true);
      expect(terms.includes('a')).toBe(false);
      expect(terms.includes('is')).toBe(false);
      expect(terms.includes('on')).toBe(false);
    });

    test('should limit terms to 100', () => {
      const longContent = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
      const terms = Product.extractSearchTerms(longContent);
      
      expect(terms.length).toBeLessThanOrEqual(100);
    });
  });
});