// Mock Redis client for tests
jest.mock('../src/config/redis', () => ({
  connect: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  isConnected: true,
  client: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn()
  }
}));

// Mock rate limiter for tests
jest.mock('rate-limiter-flexible', () => ({
  RateLimiterRedis: jest.fn().mockImplementation(() => ({
    consume: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock database for tests
const mockDb = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Electronics',
      slug: 'electronics',
      parent_id: null,
      product_count: 5,
      children: []
    }
  ])
}));

mockDb.raw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
mockDb.destroy = jest.fn().mockResolvedValue(true);

jest.mock('../src/config/database', () => mockDb);

// Mock Product model
jest.mock('../src/models/Product', () => ({
  findAll: jest.fn().mockResolvedValue([
    {
      id: 'test-product-1',
      name: 'Test Product 1',
      description: 'A test product',
      price: 99.99,
      currency: 'USD',
      availability: { status: 'in_stock', quantity: 10 },
      brand: { name: 'Test Brand' },
      category: { name: 'Test Category' }
    }
  ]),
  findById: jest.fn().mockResolvedValue({
    id: 'test-product-1',
    name: 'Test Product 1',
    description: 'A test product',
    price: 99.99,
    currency: 'USD'
  }),
  search: jest.fn().mockResolvedValue([]),
  getComparison: jest.fn().mockResolvedValue([
    {
      id: 'test-product-1',
      name: 'Test Product 1',
      price: 99.99,
      specifications: { RAM: '8GB', Storage: '256GB' },
      rating: { average: 4.5 },
      availability: { status: 'in_stock' }
    },
    {
      id: 'test-product-2',
      name: 'Test Product 2',
      price: 199.99,
      specifications: { RAM: '16GB', Storage: '512GB' },
      rating: { average: 4.7 },
      availability: { status: 'in_stock' }
    }
  ]),
  generateJsonLD: jest.fn().mockResolvedValue({
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: 'Test Product'
  })
}));

// Mock Availability model
jest.mock('../src/models/Availability', () => ({
  getProductAvailability: jest.fn().mockResolvedValue({
    productId: 'TECH-PHONE-001',
    locations: [
      {
        locationCode: 'US',
        locationName: 'United States',
        quantity: 150,
        price: 999.99,
        currency: 'USD',
        availabilityStatus: 'in_stock',
        lastUpdated: new Date().toISOString()
      }
    ],
    lastUpdated: new Date().toISOString(),
    globalStatus: 'in_stock'
  }),
  getBulkAvailability: jest.fn().mockResolvedValue({
    'TECH-PHONE-001': {
      productId: 'TECH-PHONE-001',
      locations: [{ locationCode: 'US', quantity: 150 }],
      globalStatus: 'in_stock'
    }
  }),
  updateInventory: jest.fn().mockResolvedValue([
    {
      product_id: 1,
      location_id: 1,
      quantity: 100,
      price: 999.99,
      action: 'updated'
    }
  ]),
  bulkUpdateInventory: jest.fn().mockResolvedValue({
    results: [{ productId: 'TECH-PHONE-001', result: 'updated' }],
    errors: []
  }),
  getLowStockAlerts: jest.fn().mockResolvedValue([
    {
      id: 1,
      productId: 'INNO-SMART-002',
      productName: 'InnovateLab Smart Device Pro',
      locationCode: 'EU',
      alertType: 'low_stock',
      thresholdValue: 12,
      triggeredAt: new Date().toISOString()
    }
  ])
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';