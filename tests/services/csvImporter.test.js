const CSVImporter = require('../../src/services/csvImporter');
const fs = require('fs');

// Mock dependencies
jest.mock('fs');
jest.mock('../../src/config/database');
jest.mock('../../src/models/Product');

const db = require('../../src/config/database');

describe('CSVImporter', () => {
  let importer;

  beforeEach(() => {
    importer = new CSVImporter();
    jest.clearAllMocks();
  });

  describe('transformCSVRow', () => {
    test('should transform valid CSV row', () => {
      const csvRow = {
        product_id: 'TEST-001',
        name: 'Test Product',
        short_description: 'A test product',
        price: '99.99',
        currency: 'USD',
        stock_quantity: '100',
        specifications: '{"color": "blue", "size": "large"}',
        use_cases: '["home", "office"]',
        colors: 'red,blue,green',
        featured: 'true'
      };

      const result = importer.transformCSVRow(csvRow);
      
      expect(result.product_id).toBe('TEST-001');
      expect(result.name).toBe('Test Product');
      expect(result.price).toBe(99.99);
      expect(result.stock_quantity).toBe(100);
      expect(result.specifications).toEqual({ color: 'blue', size: 'large' });
      expect(result.use_cases).toEqual(['home', 'office']);
      expect(result.colors).toEqual(['red', 'blue', 'green']);
      expect(result.featured).toBe(true);
      expect(result.active).toBe(true);
    });

    test('should throw error for missing required fields', () => {
      const invalidRow = {
        name: 'Test Product'
        // Missing product_id
      };

      expect(() => importer.transformCSVRow(invalidRow)).toThrow('Missing required fields');
    });

    test('should handle invalid JSON gracefully', () => {
      const csvRow = {
        product_id: 'TEST-001',
        name: 'Test Product',
        specifications: 'invalid json'
      };

      const result = importer.transformCSVRow(csvRow);
      
      expect(result.specifications).toBeNull();
    });
  });

  describe('parseJSON', () => {
    test('should parse valid JSON', () => {
      const result = importer.parseJSON('{"test": "value"}');
      expect(result).toEqual({ test: 'value' });
    });

    test('should return null for invalid JSON', () => {
      const result = importer.parseJSON('invalid json');
      expect(result).toBeNull();
    });

    test('should return null for empty string', () => {
      const result = importer.parseJSON('');
      expect(result).toBeNull();
    });
  });

  describe('parseFloat', () => {
    test('should parse valid float', () => {
      expect(importer.parseFloat('99.99')).toBe(99.99);
      expect(importer.parseFloat('100')).toBe(100);
    });

    test('should return null for invalid float', () => {
      expect(importer.parseFloat('invalid')).toBeNull();
      expect(importer.parseFloat('')).toBeNull();
    });
  });

  describe('parseInt', () => {
    test('should parse valid integer', () => {
      expect(importer.parseInt('100')).toBe(100);
      expect(importer.parseInt('99.99')).toBe(99);
    });

    test('should return null for invalid integer', () => {
      expect(importer.parseInt('invalid')).toBeNull();
      expect(importer.parseInt('')).toBeNull();
    });
  });

  describe('parseBoolean', () => {
    test('should parse truthy values', () => {
      expect(importer.parseBoolean('true')).toBe(true);
      expect(importer.parseBoolean('1')).toBe(true);
      expect(importer.parseBoolean('yes')).toBe(true);
      expect(importer.parseBoolean('on')).toBe(true);
      expect(importer.parseBoolean('TRUE')).toBe(true);
    });

    test('should parse falsy values', () => {
      expect(importer.parseBoolean('false')).toBe(false);
      expect(importer.parseBoolean('0')).toBe(false);
      expect(importer.parseBoolean('no')).toBe(false);
      expect(importer.parseBoolean('')).toBe(false);
    });
  });

  describe('parseDate', () => {
    test('should parse valid date string', () => {
      const result = importer.parseDate('2025-01-01');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
    });

    test('should return null for invalid date', () => {
      expect(importer.parseDate('invalid date')).toBeNull();
      expect(importer.parseDate('')).toBeNull();
    });
  });

  describe('parseArray', () => {
    test('should parse comma-separated string', () => {
      const result = importer.parseArray('red, blue, green');
      expect(result).toEqual(['red', 'blue', 'green']);
    });

    test('should return array if already array', () => {
      const input = ['red', 'blue', 'green'];
      const result = importer.parseArray(input);
      expect(result).toEqual(input);
    });

    test('should return empty array for empty input', () => {
      expect(importer.parseArray('')).toEqual([]);
      expect(importer.parseArray(null)).toEqual([]);
    });
  });

  describe('parseImageUrls', () => {
    test('should parse comma-separated URLs', () => {
      const urls = 'https://example.com/1.jpg, https://example.com/2.jpg';
      const result = importer.parseImageUrls(urls);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        url: 'https://example.com/1.jpg',
        alt: '',
        primary: false
      });
    });
  });

  describe('parseDimensions', () => {
    test('should parse dimension string', () => {
      const result = importer.parseDimensions('10x5x2 inches');
      
      expect(result).toEqual({
        length: 10,
        width: 5,
        height: 2,
        unit: 'inches'
      });
    });

    test('should handle dimension without unit', () => {
      const result = importer.parseDimensions('10x5x2');
      
      expect(result.unit).toBe('inches');
    });

    test('should return empty object for invalid format', () => {
      const result = importer.parseDimensions('invalid format');
      expect(result).toEqual({});
    });
  });

  describe('validateAvailabilityStatus', () => {
    test('should return valid statuses', () => {
      expect(importer.validateAvailabilityStatus('in_stock')).toBe('in_stock');
      expect(importer.validateAvailabilityStatus('limited_stock')).toBe('limited_stock');
      expect(importer.validateAvailabilityStatus('out_of_stock')).toBe('out_of_stock');
      expect(importer.validateAvailabilityStatus('discontinued')).toBe('discontinued');
    });

    test('should default to in_stock for invalid status', () => {
      expect(importer.validateAvailabilityStatus('invalid')).toBe('in_stock');
    });
  });

  describe('generateAITags', () => {
    test('should generate tags from product data', () => {
      const row = {
        category: 'Electronics',
        price: '150.00',
        short_description: 'Wireless bluetooth headphones',
        detailed_description: 'Premium waterproof wireless headphones'
      };

      const result = importer.generateAITags(row);
      
      expect(result).toContain('category:electronics');
      expect(result).toContain('price:mid-range');
      expect(result).toContain('feature:wireless');
      expect(result).toContain('feature:bluetooth');
      expect(result).toContain('feature:waterproof');
    });

    test('should handle budget pricing', () => {
      const row = {
        price: '25.00',
        short_description: 'Basic product'
      };

      const result = importer.generateAITags(row);
      expect(result).toContain('price:budget');
    });

    test('should handle premium pricing', () => {
      const row = {
        price: '500.00',
        short_description: 'Premium product'
      };

      const result = importer.generateAITags(row);
      expect(result).toContain('price:premium');
    });
  });

  describe('findOrCreateBrand', () => {
    test('should find existing brand', async () => {
      const mockBrand = { id: 1, name: 'Existing Brand' };
      
      db.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockBrand)
      });

      const result = await importer.findOrCreateBrand('Existing Brand');
      
      expect(result).toBe(1);
    });

    test('should create new brand if not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };

      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 2 }])
      };

      db.mockReturnValueOnce(mockQuery).mockReturnValueOnce(mockInsert);

      const result = await importer.findOrCreateBrand('New Brand');
      
      expect(result).toBe(2);
      expect(mockInsert.insert).toHaveBeenCalledWith({
        name: 'New Brand',
        description: null
      });
    });
  });

  describe('findOrCreateCategory', () => {
    test('should find existing category', async () => {
      const mockCategory = { id: 1, name: 'Electronics' };
      
      db.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockCategory)
      });

      const result = await importer.findOrCreateCategory('Electronics');
      
      expect(result).toBe(1);
    });

    test('should create new category with slug', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };

      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 2 }])
      };

      db.mockReturnValueOnce(mockQuery).mockReturnValueOnce(mockInsert);

      const result = await importer.findOrCreateCategory('Home & Garden');
      
      expect(result).toBe(2);
      expect(mockInsert.insert).toHaveBeenCalledWith({
        name: 'Home & Garden',
        slug: 'home-garden',
        description: null
      });
    });
  });
});