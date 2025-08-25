exports.up = function(knex) {
  return knex.schema
    .createTable('brands', (table) => {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('website_url', 500);
      table.text('story');
      table.json('contact_info');
      table.json('policies'); // return, warranty policies
      table.timestamps(true, true);
      table.index(['name']);
    })
    .createTable('categories', (table) => {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('slug', 255).notNullable().unique();
      table.text('description');
      table.integer('parent_id').unsigned().nullable();
      table.json('metadata');
      table.timestamps(true, true);
      table.foreign('parent_id').references('categories.id').onDelete('CASCADE');
      table.index(['slug', 'parent_id']);
    })
    .createTable('products', (table) => {
      table.increments('id').primary();
      table.string('product_id', 100).notNullable().unique();
      table.string('name', 500).notNullable();
      table.text('short_description');
      table.text('detailed_description');
      table.json('specifications');
      table.json('use_cases');
      table.string('target_audience', 500);
      table.decimal('price', 10, 2);
      table.string('currency', 3).defaultTo('USD');
      table.integer('stock_quantity').defaultTo(0);
      table.enum('availability_status', ['in_stock', 'limited_stock', 'out_of_stock', 'discontinued']).defaultTo('in_stock');
      table.timestamp('restock_date');
      table.json('images'); // array of image URLs
      table.integer('brand_id').unsigned().nullable();
      table.integer('category_id').unsigned().nullable();
      table.string('model', 255);
      table.decimal('weight', 8, 3); // in pounds or kg
      table.json('dimensions'); // {length, width, height, unit}
      table.json('colors'); // array of available colors
      table.json('sizes'); // array of available sizes
      table.json('materials'); // array of materials
      table.string('warranty', 255);
      table.text('care_instructions');
      table.json('seo_keywords'); // for search optimization
      table.json('ai_tags'); // AI-specific tags for better recommendations
      table.json('alternatives'); // related/alternative product IDs
      table.json('accessories'); // compatible accessory product IDs
      table.decimal('avg_rating', 3, 2).defaultTo(0);
      table.integer('review_count').defaultTo(0);
      table.boolean('featured').defaultTo(false);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
      
      table.foreign('brand_id').references('brands.id').onDelete('SET NULL');
      table.foreign('category_id').references('categories.id').onDelete('SET NULL');
      table.index(['product_id', 'active']);
      table.index(['category_id', 'active']);
      table.index(['brand_id', 'active']);
      table.index(['availability_status']);
      table.index(['featured', 'active']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('products')
    .dropTableIfExists('categories')
    .dropTableIfExists('brands');
};