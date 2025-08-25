const db = require('../config/database');
const jsonld = require('jsonld');
const aiCrawler = require('../services/aiCrawlerIntelligence');

class Product {
  constructor() {
    this.tableName = 'products';
  }

  // Get all products with optional filtering
  async findAll(filters = {}) {
    let query = db(this.tableName)
      .select([
        'products.*',
        'brands.name as brand_name',
        'categories.name as category_name',
        'categories.slug as category_slug'
      ])
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .where('products.active', true);

    // Apply filters
    if (filters.category) {
      query = query.where('categories.slug', filters.category);
    }
    
    if (filters.brand) {
      query = query.where('brands.name', 'ilike', `%${filters.brand}%`);
    }
    
    if (filters.availability) {
      query = query.where('products.availability_status', filters.availability);
    }
    
    if (filters.featured) {
      query = query.where('products.featured', true);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const products = await query;
    return products.map(this.transformProduct);
  }

  // Get product by ID or product_id
  async findById(id) {
    const product = await db(this.tableName)
      .select([
        'products.*',
        'brands.name as brand_name',
        'brands.description as brand_description',
        'brands.website_url as brand_website',
        'categories.name as category_name',
        'categories.slug as category_slug',
        'categories.description as category_description'
      ])
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .where(isNaN(id) ? 'products.product_id' : 'products.id', id)
      .where('products.active', true)
      .first();

    return product ? this.transformProduct(product) : null;
  }

  // Search products
  async search(query, options = {}) {
    const searchQuery = db('products')
      .select([
        'products.*',
        'brands.name as brand_name',
        'categories.name as category_name',
        'categories.slug as category_slug'
      ])
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .leftJoin('product_search_index', 'products.id', 'product_search_index.product_id')
      .where('products.active', true)
      .where(function() {
        this.where('products.name', 'ilike', `%${query}%`)
            .orWhere('products.short_description', 'ilike', `%${query}%`)
            .orWhere('products.detailed_description', 'ilike', `%${query}%`)
            .orWhereRaw("to_tsvector('english', product_search_index.search_content) @@ plainto_tsquery('english', ?)", [query]);
      })
      .orderByRaw("ts_rank(to_tsvector('english', COALESCE(product_search_index.search_content, products.name)), plainto_tsquery('english', ?)) DESC", [query]);

    if (options.limit) {
      searchQuery.limit(options.limit);
    }

    const products = await searchQuery;
    return products.map(this.transformProduct);
  }

  // Create new product
  async create(productData) {
    const [product] = await db(this.tableName)
      .insert(productData)
      .returning('*');
    
    // Update search index
    await this.updateSearchIndex(product.id);
    
    return this.transformProduct(product);
  }

  // Update product
  async update(id, productData) {
    const [product] = await db(this.tableName)
      .where(isNaN(id) ? 'product_id' : 'id', id)
      .update({
        ...productData,
        updated_at: db.fn.now()
      })
      .returning('*');
    
    if (product) {
      await this.updateSearchIndex(product.id);
    }
    
    return product ? this.transformProduct(product) : null;
  }

  // Delete product (soft delete)
  async delete(id) {
    return db(this.tableName)
      .where(isNaN(id) ? 'product_id' : 'id', id)
      .update({
        active: false,
        updated_at: db.fn.now()
      });
  }

  // Get products for comparison
  async getComparison(productIds) {
    const products = await db(this.tableName)
      .select([
        'products.*',
        'brands.name as brand_name',
        'categories.name as category_name'
      ])
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .whereIn('products.product_id', productIds)
      .where('products.active', true);

    return products.map(this.transformProduct);
  }

  // Transform product for API response
  transformProduct(product) {
    if (!product) return null;

    return {
      id: product.product_id || product.id,
      name: product.name,
      description: product.short_description,
      detailedDescription: product.detailed_description,
      specifications: product.specifications || {},
      useCases: product.use_cases || [],
      targetAudience: product.target_audience,
      price: parseFloat(product.price) || 0,
      currency: product.currency,
      availability: {
        status: product.availability_status,
        quantity: product.stock_quantity,
        restockDate: product.restock_date
      },
      images: product.images || [],
      brand: {
        id: product.brand_id,
        name: product.brand_name,
        description: product.brand_description,
        website: product.brand_website
      },
      category: {
        id: product.category_id,
        name: product.category_name,
        slug: product.category_slug,
        description: product.category_description
      },
      model: product.model,
      weight: product.weight,
      dimensions: product.dimensions || {},
      colors: product.colors || [],
      sizes: product.sizes || [],
      materials: product.materials || [],
      warranty: product.warranty,
      careInstructions: product.care_instructions,
      rating: {
        average: parseFloat(product.avg_rating) || 0,
        count: product.review_count || 0
      },
      alternatives: product.alternatives || [],
      accessories: product.accessories || [],
      featured: product.featured,
      createdAt: product.created_at,
      updatedAt: product.updated_at
    };
  }

  // Generate AI-optimized JSON-LD schema
  async generateJsonLD(product, req) {
    const crawlerType = req.crawlerType || 'default';
    
    // Use AI crawler intelligence for enhanced JSON-LD generation
    return aiCrawler.generateEnhancedJsonLD(product, crawlerType, req);
  }

  // Map availability status to Schema.org
  mapAvailabilityToSchema(status) {
    const mapping = {
      'in_stock': 'https://schema.org/InStock',
      'limited_stock': 'https://schema.org/LimitedAvailability',
      'out_of_stock': 'https://schema.org/OutOfStock',
      'discontinued': 'https://schema.org/Discontinued'
    };
    return mapping[status] || 'https://schema.org/OutOfStock';
  }

  // Update search index
  async updateSearchIndex(productId) {
    const product = await db('products')
      .where('id', productId)
      .first();

    if (!product) return;

    const searchContent = [
      product.name,
      product.short_description,
      product.detailed_description,
      product.target_audience,
      JSON.stringify(product.specifications || {}),
      JSON.stringify(product.use_cases || []),
      JSON.stringify(product.materials || []),
      product.model,
      product.warranty
    ].filter(Boolean).join(' ');

    const searchTerms = this.extractSearchTerms(searchContent);

    await db('product_search_index')
      .insert({
        product_id: productId,
        search_content: searchContent,
        search_terms: JSON.stringify(searchTerms)
      })
      .onConflict('product_id')
      .merge();
  }

  // Extract search terms
  extractSearchTerms(content) {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 100); // Limit to 100 terms
  }
}

module.exports = new Product();