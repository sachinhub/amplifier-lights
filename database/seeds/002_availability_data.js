exports.seed = async function(knex) {
  // Clean up existing availability data
  await knex('webhook_deliveries').del();
  await knex('webhook_endpoints').del();
  await knex('availability_alerts').del();
  await knex('price_history').del();
  await knex('inventory_snapshots').del();
  await knex('locations').del();

  // Insert locations
  await knex('locations').insert([
    {
      id: 1,
      code: 'US',
      name: 'United States',
      country: 'United States',
      region: 'North America',
      timezone: 'America/New_York',
      delivery_zones: JSON.stringify([
        'US-EAST', 'US-WEST', 'US-CENTRAL', 'US-SOUTH'
      ]),
      active: true
    },
    {
      id: 2,
      code: 'EU',
      name: 'European Union',
      country: 'European Union',
      region: 'Europe',
      timezone: 'Europe/London',
      delivery_zones: JSON.stringify([
        'EU-WEST', 'EU-NORTH', 'EU-SOUTH', 'EU-CENTRAL'
      ]),
      active: true
    },
    {
      id: 3,
      code: 'ASIA',
      name: 'Asia Pacific',
      country: 'Asia Pacific',
      region: 'Asia',
      timezone: 'Asia/Tokyo',
      delivery_zones: JSON.stringify([
        'ASIA-EAST', 'ASIA-SOUTH', 'ASIA-SOUTHEAST'
      ]),
      active: true
    },
    {
      id: 4,
      code: 'GLOBAL',
      name: 'Global Warehouse',
      country: null,
      region: 'Global',
      timezone: 'UTC',
      delivery_zones: JSON.stringify(['WORLDWIDE']),
      active: true
    }
  ]);

  // Insert inventory snapshots for the sample products
  await knex('inventory_snapshots').insert([
    // TechCorp Pro Smartphone X1 - US
    {
      product_id: 1, // TECH-PHONE-001
      location_id: 1, // US
      quantity: 150,
      price: 999.99,
      currency: 'USD',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '2-3 business days',
        express: '1-2 business days',
        overnight: 'Next business day'
      }),
      threshold_low: 20,
      threshold_critical: 5
    },
    // TechCorp Pro Smartphone X1 - EU
    {
      product_id: 1,
      location_id: 2, // EU
      quantity: 85,
      price: 899.99,
      currency: 'EUR',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '3-5 business days',
        express: '2-3 business days'
      }),
      threshold_low: 15,
      threshold_critical: 5
    },
    // TechCorp Pro Smartphone X1 - ASIA
    {
      product_id: 1,
      location_id: 3, // ASIA
      quantity: 45,
      price: 1099.99,
      currency: 'USD',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '5-7 business days',
        express: '3-4 business days'
      }),
      threshold_low: 10,
      threshold_critical: 3
    },
    // InnovateLab Smart Device Pro - US
    {
      product_id: 2, // INNO-SMART-002
      location_id: 1, // US
      quantity: 87,
      price: 299.99,
      currency: 'USD',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '2-4 business days',
        express: '1-2 business days'
      }),
      threshold_low: 25,
      threshold_critical: 10
    },
    // InnovateLab Smart Device Pro - EU
    {
      product_id: 2,
      location_id: 2, // EU
      quantity: 12,
      price: 279.99,
      currency: 'EUR',
      availability_status: 'limited_stock',
      restock_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      delivery_estimates: JSON.stringify({
        standard: '4-6 business days',
        express: '3-4 business days'
      }),
      threshold_low: 15,
      threshold_critical: 5
    },
    // TechCorp UltraBook Elite 15 - US
    {
      product_id: 3, // TECH-LAPTOP-003
      location_id: 1, // US
      quantity: 23,
      price: 2499.99,
      currency: 'USD',
      availability_status: 'limited_stock',
      restock_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      delivery_estimates: JSON.stringify({
        standard: '3-5 business days',
        express: '2-3 business days',
        white_glove: '5-7 business days'
      }),
      threshold_low: 30,
      threshold_critical: 10
    },
    // TechCorp UltraBook Elite 15 - EU
    {
      product_id: 3,
      location_id: 2, // EU
      quantity: 0,
      price: 2299.99,
      currency: 'EUR',
      availability_status: 'out_of_stock',
      restock_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      delivery_estimates: JSON.stringify({
        pre_order: '3-4 weeks'
      }),
      threshold_low: 20,
      threshold_critical: 5
    }
  ]);

  // Insert some price history
  await knex('price_history').insert([
    {
      product_id: 1,
      location_id: 1,
      old_price: 1099.99,
      new_price: 999.99,
      currency: 'USD',
      change_reason: 'promotional_pricing',
      metadata: JSON.stringify({
        change_percentage: -9.09,
        promotion: 'Launch Special',
        valid_until: '2025-12-31'
      }),
      effective_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    },
    {
      product_id: 2,
      location_id: 2,
      old_price: 319.99,
      new_price: 279.99,
      currency: 'EUR',
      change_reason: 'competitive_adjustment',
      metadata: JSON.stringify({
        change_percentage: -12.5,
        competitor_analysis: true
      }),
      effective_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    }
  ]);

  // Insert availability alerts
  await knex('availability_alerts').insert([
    {
      product_id: 2, // InnovateLab Smart Device Pro
      location_id: 2, // EU
      alert_type: 'low_stock',
      threshold_value: 12,
      alert_data: JSON.stringify({
        threshold: 15,
        current_quantity: 12,
        projected_stock_out: '2025-09-05'
      }),
      triggered_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      processed: false
    },
    {
      product_id: 3, // TechCorp UltraBook Elite 15
      location_id: 1, // US
      alert_type: 'low_stock',
      threshold_value: 23,
      alert_data: JSON.stringify({
        threshold: 30,
        current_quantity: 23,
        high_demand: true
      }),
      triggered_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      processed: false
    },
    {
      product_id: 3, // TechCorp UltraBook Elite 15
      location_id: 2, // EU
      alert_type: 'out_of_stock',
      threshold_value: 0,
      alert_data: JSON.stringify({
        previous_quantity: 5,
        last_sale: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }),
      triggered_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      processed: false
    }
  ]);

  // Insert sample webhook endpoints
  await knex('webhook_endpoints').insert([
    {
      id: 1,
      name: 'Inventory Management System',
      url: 'https://inventory.example.com/webhooks/amplifier-light',
      event_type: 'inventory_update',
      headers: JSON.stringify({
        'Authorization': 'Bearer demo-token',
        'Content-Type': 'application/json'
      }),
      secret: 'demo-webhook-secret-key',
      active: true,
      retry_count: 3,
      timeout_ms: 10000
    },
    {
      id: 2,
      name: 'Low Stock Alert System',
      url: 'https://alerts.example.com/webhooks/stock-alerts',
      event_type: 'low_stock_alert',
      headers: JSON.stringify({
        'X-API-Key': 'demo-api-key'
      }),
      secret: 'alert-webhook-secret',
      active: true,
      retry_count: 5,
      timeout_ms: 8000
    },
    {
      id: 3,
      name: 'Price Change Notifications',
      url: 'https://pricing.example.com/webhooks/price-changes',
      event_type: 'price_change',
      headers: JSON.stringify({
        'Authorization': 'Bearer price-token-123'
      }),
      secret: 'price-change-secret',
      active: true,
      retry_count: 3,
      timeout_ms: 5000
    }
  ]);

  // Insert some sample webhook deliveries (for testing)
  await knex('webhook_deliveries').insert([
    {
      webhook_id: 1,
      product_id: 1,
      payload: JSON.stringify({
        event: 'inventory_update',
        productId: 'TECH-PHONE-001',
        data: {
          location: 'US',
          oldQuantity: 160,
          newQuantity: 150,
          timestamp: new Date().toISOString()
        }
      }),
      status: 'delivered',
      http_status: 200,
      response_body: '{"status":"received","id":"wh-123"}',
      attempt_count: 1,
      delivered_at: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    },
    {
      webhook_id: 2,
      product_id: 2,
      payload: JSON.stringify({
        event: 'low_stock_alert',
        productId: 'INNO-SMART-002',
        data: {
          location: 'EU',
          quantity: 12,
          threshold: 15,
          timestamp: new Date().toISOString()
        }
      }),
      status: 'pending',
      attempt_count: 1,
      next_retry_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    }
  ]);

  // Reset sequences
  await knex.raw("SELECT setval('locations_id_seq', (SELECT MAX(id) FROM locations))");
  await knex.raw("SELECT setval('inventory_snapshots_id_seq', (SELECT MAX(id) FROM inventory_snapshots))");
  await knex.raw("SELECT setval('webhook_endpoints_id_seq', (SELECT MAX(id) FROM webhook_endpoints))");
};