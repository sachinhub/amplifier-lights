const Availability = require('../../src/models/Availability');

// Mock the database and redis
jest.mock('../../src/config/database');
jest.mock('../../src/config/redis');

const db = require('../../src/config/database');
const redisClient = require('../../src/config/redis');

describe('Availability Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductAvailability', () => {
    test('should return cached availability if available', async () => {
      const cachedData = {
        productId: 'TEST-001',
        locations: [{ locationCode: 'US', quantity: 100 }],
        globalStatus: 'in_stock'
      };

      redisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await Availability.getProductAvailability('TEST-001');
      
      expect(result).toEqual(cachedData);
      expect(redisClient.get).toHaveBeenCalledWith('availability:TEST-001:global');
    });

    test('should query database when cache miss', async () => {
      const mockAvailability = [
        {
          product_id: 'TEST-001',
          quantity: 100,
          price: 99.99,
          availability_status: 'in_stock',
          location_code: 'US',
          location_name: 'United States',
          last_updated: '2025-01-01T00:00:00Z'
        }
      ];

      redisClient.get.mockResolvedValue(null);
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockAvailability)
      });

      const result = await Availability.getProductAvailability('TEST-001');
      
      expect(result.productId).toBe('TEST-001');
      expect(result.locations).toHaveLength(1);
      expect(result.globalStatus).toBe('in_stock');
    });

    test('should filter by location when provided', async () => {
      redisClient.get.mockResolvedValue(null);
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([])
      };

      db.mockReturnValue(mockQuery);

      await Availability.getProductAvailability('TEST-001', 'US');
      
      expect(mockQuery.where).toHaveBeenCalledWith('locations.code', 'US');
    });
  });

  describe('updateInventory', () => {
    test('should update existing inventory record', async () => {
      const mockTransaction = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn(),
        insert: jest.fn().mockReturnValue([{ id: 1 }]),
        update: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn()
      };

      // Mock existing product
      mockTransaction.first.mockResolvedValueOnce({ id: 1, product_id: 'TEST-001' });
      // Mock existing location
      mockTransaction.first.mockResolvedValueOnce({ id: 1, code: 'US' });
      // Mock existing inventory
      mockTransaction.first.mockResolvedValueOnce({ 
        id: 1, 
        product_id: 1, 
        location_id: 1, 
        quantity: 50, 
        price: 99.99 
      });

      db.transaction.mockResolvedValue(mockTransaction);
      mockTransaction.mockReturnValue(mockTransaction);

      const updates = [{
        locationCode: 'US',
        quantity: 100,
        price: 89.99
      }];

      await Availability.updateInventory('TEST-001', updates);
      
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    test('should create new inventory record if none exists', async () => {
      const mockTransaction = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn(),
        insert: jest.fn().mockReturnValue([{ id: 1, quantity: 100 }]),
        returning: jest.fn().mockReturnThis(),
        commit: jest.fn(),
        rollback: jest.fn()
      };

      // Mock existing product
      mockTransaction.first.mockResolvedValueOnce({ id: 1, product_id: 'TEST-001' });
      // Mock existing location  
      mockTransaction.first.mockResolvedValueOnce({ id: 1, code: 'US' });
      // Mock no existing inventory
      mockTransaction.first.mockResolvedValueOnce(null);

      db.transaction.mockResolvedValue(mockTransaction);
      mockTransaction.mockReturnValue(mockTransaction);

      const updates = [{
        locationCode: 'US',
        quantity: 100,
        price: 99.99
      }];

      const result = await Availability.updateInventory('TEST-001', updates);
      
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should rollback on error', async () => {
      const mockTransaction = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockRejectedValue(new Error('DB Error')),
        rollback: jest.fn()
      };

      db.transaction.mockResolvedValue(mockTransaction);

      await expect(Availability.updateInventory('TEST-001', [{}])).rejects.toThrow('DB Error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('transformAvailability', () => {
    test('should transform database availability to API format', () => {
      const dbAvailability = {
        location_code: 'US',
        location_name: 'United States',
        quantity: 100,
        price: 99.99,
        currency: 'USD',
        availability_status: 'in_stock',
        restock_date: '2025-02-01T00:00:00Z',
        delivery_estimates: '{"standard": "2-3 days"}',
        last_updated: '2025-01-01T00:00:00Z'
      };

      const result = Availability.transformAvailability(dbAvailability);
      
      expect(result.locationCode).toBe('US');
      expect(result.locationName).toBe('United States');
      expect(result.quantity).toBe(100);
      expect(result.price).toBe(99.99);
      expect(result.currency).toBe('USD');
      expect(result.availabilityStatus).toBe('in_stock');
      expect(result.deliveryEstimates).toEqual({ standard: '2-3 days' });
    });
  });

  describe('calculateGlobalStatus', () => {
    test('should return in_stock when any location has stock', () => {
      const availability = [
        { availability_status: 'out_of_stock' },
        { availability_status: 'in_stock' },
        { availability_status: 'limited_stock' }
      ];

      const result = Availability.calculateGlobalStatus(availability);
      expect(result).toBe('in_stock');
    });

    test('should return limited_stock when no in_stock but has limited_stock', () => {
      const availability = [
        { availability_status: 'out_of_stock' },
        { availability_status: 'limited_stock' }
      ];

      const result = Availability.calculateGlobalStatus(availability);
      expect(result).toBe('limited_stock');
    });

    test('should return out_of_stock for empty availability', () => {
      const result = Availability.calculateGlobalStatus([]);
      expect(result).toBe('out_of_stock');
    });
  });

  describe('calculateAvailabilityStatus', () => {
    test('should return correct status based on quantity', () => {
      expect(Availability.calculateAvailabilityStatus(0)).toBe('out_of_stock');
      expect(Availability.calculateAvailabilityStatus(3)).toBe('limited_stock');
      expect(Availability.calculateAvailabilityStatus(5)).toBe('limited_stock');
      expect(Availability.calculateAvailabilityStatus(10)).toBe('in_stock');
      expect(Availability.calculateAvailabilityStatus(100)).toBe('in_stock');
    });
  });

  describe('getBulkAvailability', () => {
    test('should return availability for multiple products', async () => {
      // Mock successful calls
      const mockGetProductAvailability = jest.spyOn(Availability, 'getProductAvailability');
      mockGetProductAvailability
        .mockResolvedValueOnce({ productId: 'TEST-001', globalStatus: 'in_stock' })
        .mockResolvedValueOnce({ productId: 'TEST-002', globalStatus: 'out_of_stock' });

      const result = await Availability.getBulkAvailability(['TEST-001', 'TEST-002']);
      
      expect(result['TEST-001'].globalStatus).toBe('in_stock');
      expect(result['TEST-002'].globalStatus).toBe('out_of_stock');
      
      mockGetProductAvailability.mockRestore();
    });

    test('should handle errors for individual products', async () => {
      const mockGetProductAvailability = jest.spyOn(Availability, 'getProductAvailability');
      mockGetProductAvailability
        .mockResolvedValueOnce({ productId: 'TEST-001', globalStatus: 'in_stock' })
        .mockRejectedValueOnce(new Error('Product not found'));

      const result = await Availability.getBulkAvailability(['TEST-001', 'TEST-002']);
      
      expect(result['TEST-001'].globalStatus).toBe('in_stock');
      expect(result['TEST-002'].error).toBe('Product not found');
      
      mockGetProductAvailability.mockRestore();
    });
  });

  describe('getLowStockAlerts', () => {
    test('should return low stock alerts', async () => {
      const mockAlerts = [
        {
          id: 1,
          product_id: 'TEST-001',
          product_name: 'Test Product',
          location_code: 'US',
          alert_type: 'low_stock',
          threshold_value: 5,
          triggered_at: '2025-01-01T00:00:00Z'
        }
      ];

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockAlerts)
      });

      const result = await Availability.getLowStockAlerts();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    test('should filter by location when provided', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      };

      db.mockReturnValue(mockQuery);

      await Availability.getLowStockAlerts('US');
      
      expect(mockQuery.where).toHaveBeenCalledWith('locations.code', 'US');
    });
  });
});