exports.up = function(knex) {
  return knex.schema
    .createTable('product_search_index', (table) => {
      table.increments('id').primary();
      table.integer('product_id').unsigned().notNullable();
      table.text('search_content'); // Combined searchable content
      table.json('search_terms'); // Extracted search terms
      table.decimal('search_rank', 8, 6).defaultTo(1.0);
      table.timestamps(true, true);
      
      table.foreign('product_id').references('products.id').onDelete('CASCADE');
      table.index(['product_id']);
    })
    .raw(`
      CREATE INDEX IF NOT EXISTS product_search_content_idx 
      ON product_search_index 
      USING gin(to_tsvector('english', search_content))
    `);
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('product_search_index');
};