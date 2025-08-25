exports.up = function(knex) {
  return knex.schema
    .createTable('locations', (table) => {
      table.increments('id').primary();
      table.string('code', 10).notNullable().unique(); // US, EU, ASIA, etc.
      table.string('name', 100).notNullable();
      table.string('country', 100);
      table.string('region', 100);
      table.string('timezone', 50);
      table.json('delivery_zones'); // supported delivery areas
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
      table.index(['code', 'active']);
    })
    .createTable('inventory_snapshots', (table) => {
      table.increments('id').primary();
      table.integer('product_id').unsigned().notNullable();
      table.integer('location_id').unsigned().nullable();
      table.integer('quantity').notNullable().defaultTo(0);
      table.decimal('price', 10, 2).notNullable();
      table.string('currency', 3).defaultTo('USD');
      table.enum('availability_status', [
        'in_stock', 
        'limited_stock', 
        'out_of_stock', 
        'discontinued',
        'pre_order'
      ]).defaultTo('in_stock');
      table.timestamp('restock_date').nullable();
      table.integer('restock_quantity').nullable();
      table.json('delivery_estimates'); // { standard: '2-3 days', express: '1-2 days' }
      table.decimal('threshold_low', 8, 0).defaultTo(10); // low stock threshold
      table.decimal('threshold_critical', 8, 0).defaultTo(5); // critical stock threshold
      table.timestamp('last_updated').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.foreign('product_id').references('products.id').onDelete('CASCADE');
      table.foreign('location_id').references('locations.id').onDelete('CASCADE');
      table.index(['product_id', 'location_id']);
      table.index(['availability_status']);
      table.index(['last_updated']);
    })
    .createTable('price_history', (table) => {
      table.increments('id').primary();
      table.integer('product_id').unsigned().notNullable();
      table.integer('location_id').unsigned().nullable();
      table.decimal('old_price', 10, 2).notNullable();
      table.decimal('new_price', 10, 2).notNullable();
      table.string('currency', 3).defaultTo('USD');
      table.string('change_reason', 255); // promotion, restock, demand, etc.
      table.json('metadata'); // additional context
      table.timestamp('effective_date').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.foreign('product_id').references('products.id').onDelete('CASCADE');
      table.foreign('location_id').references('locations.id').onDelete('CASCADE');
      table.index(['product_id', 'effective_date']);
    })
    .createTable('availability_alerts', (table) => {
      table.increments('id').primary();
      table.integer('product_id').unsigned().notNullable();
      table.integer('location_id').unsigned().nullable();
      table.enum('alert_type', [
        'low_stock',
        'out_of_stock', 
        'restock',
        'price_change',
        'availability_change'
      ]).notNullable();
      table.integer('threshold_value').nullable(); // stock level that triggered alert
      table.json('alert_data'); // additional alert context
      table.timestamp('triggered_at').defaultTo(knex.fn.now());
      table.boolean('processed').defaultTo(false);
      table.timestamp('processed_at').nullable();
      table.timestamps(true, true);
      
      table.foreign('product_id').references('products.id').onDelete('CASCADE');
      table.foreign('location_id').references('locations.id').onDelete('CASCADE');
      table.index(['product_id', 'alert_type', 'processed']);
    })
    .createTable('webhook_endpoints', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('url', 500).notNullable();
      table.enum('event_type', [
        'inventory_update',
        'price_change',
        'availability_change',
        'low_stock_alert',
        'restock_notification'
      ]).notNullable();
      table.json('headers'); // custom headers for webhook
      table.string('secret', 255); // webhook signature secret
      table.boolean('active').defaultTo(true);
      table.integer('retry_count').defaultTo(3);
      table.integer('timeout_ms').defaultTo(5000);
      table.timestamps(true, true);
      table.index(['event_type', 'active']);
    })
    .createTable('webhook_deliveries', (table) => {
      table.increments('id').primary();
      table.integer('webhook_id').unsigned().notNullable();
      table.integer('product_id').unsigned().nullable();
      table.json('payload'); // the data sent
      table.integer('http_status').nullable();
      table.text('response_body').nullable();
      table.integer('attempt_count').defaultTo(1);
      table.timestamp('delivered_at').nullable();
      table.timestamp('next_retry_at').nullable();
      table.enum('status', ['pending', 'delivered', 'failed', 'abandoned']).defaultTo('pending');
      table.timestamps(true, true);
      
      table.foreign('webhook_id').references('webhook_endpoints.id').onDelete('CASCADE');
      table.foreign('product_id').references('products.id').onDelete('CASCADE');
      table.index(['status', 'next_retry_at']);
      table.index(['webhook_id', 'created_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('webhook_deliveries')
    .dropTableIfExists('webhook_endpoints')
    .dropTableIfExists('availability_alerts')
    .dropTableIfExists('price_history')
    .dropTableIfExists('inventory_snapshots')
    .dropTableIfExists('locations');
};