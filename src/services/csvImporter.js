const csv = require('csv-parser');
const fs = require('fs');
const db = require('../config/database');
const Product = require('../models/Product');
const logger = require('../utils/logger');

class CSVImporter {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async importProducts(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          try {
            const product = this.transformCSVRow(data);
            results.push(product);
          } catch (error) {
            errors.push({
              row: data,
              error: error.message
            });
          }
        })
        .on('end', async () => {
          try {
            const importResult = await this.bulkInsertProducts(results);
            resolve({
              success: importResult.success,
              failed: importResult.failed,
              errors: [...errors, ...importResult.errors]
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  transformCSVRow(row) {
    // Validate required fields
    if (!row.product_id || !row.name) {
      throw new Error('Missing required fields: product_id and name');
    }

    return {
      product_id: row.product_id,
      name: row.name,
      short_description: row.short_description || null,
      detailed_description: row.detailed_description || null,
      specifications: this.parseJSON(row.specifications),
      use_cases: this.parseJSON(row.use_cases) || [],
      target_audience: row.target_audience || null,
      price: this.parseFloat(row.price) || 0,
      currency: row.currency || 'USD',
      stock_quantity: this.parseInt(row.stock_quantity) || 0,
      availability_status: this.validateAvailabilityStatus(row.availability_status),
      restock_date: this.parseDate(row.restock_date),
      images: this.parseJSON(row.image_url) || this.parseImageUrls(row.image_url),
      brand_id: this.parseInt(row.brand_id) || null,
      category_id: this.parseInt(row.category_id) || null,
      model: row.model || null,
      weight: this.parseFloat(row.weight) || null,
      dimensions: this.parseJSON(row.dimensions) || this.parseDimensions(row.dimensions),
      colors: this.parseJSON(row.colors) || this.parseArray(row.colors),
      sizes: this.parseJSON(row.sizes) || this.parseArray(row.sizes),
      materials: this.parseJSON(row.materials) || this.parseArray(row.materials),
      warranty: row.warranty || null,
      care_instructions: row.care_instructions || null,
      alternatives: this.parseJSON(row.alternatives) || this.parseArray(row.alternatives),
      accessories: this.parseJSON(row.accessories) || this.parseArray(row.accessories),
      seo_keywords: this.parseJSON(row.seo_keywords) || this.parseArray(row.seo_keywords),
      ai_tags: this.parseJSON(row.ai_tags) || this.generateAITags(row),
      featured: this.parseBoolean(row.featured),
      active: true
    };
  }

  async bulkInsertProducts(products) {
    const success = [];
    const failed = [];
    const errors = [];

    for (const product of products) {
      try {
        // Check if brand exists or create it
        if (product.brand_name && !product.brand_id) {
          product.brand_id = await this.findOrCreateBrand(product.brand_name, product.brand_description);
        }

        // Check if category exists or create it
        if (product.category_name && !product.category_id) {
          product.category_id = await this.findOrCreateCategory(product.category_name, product.category_description);
        }

        // Insert or update product
        const existingProduct = await db('products')
          .where('product_id', product.product_id)
          .first();

        if (existingProduct) {
          await db('products')
            .where('product_id', product.product_id)
            .update({
              ...product,
              updated_at: db.fn.now()
            });
          
          await Product.updateSearchIndex(existingProduct.id);
          success.push({ action: 'updated', product_id: product.product_id });
        } else {
          const [insertedProduct] = await db('products')
            .insert(product)
            .returning(['id', 'product_id']);
          
          await Product.updateSearchIndex(insertedProduct.id);
          success.push({ action: 'created', product_id: product.product_id });
        }

      } catch (error) {
        logger.error('Failed to import product:', error);
        failed.push(product.product_id);
        errors.push({
          product_id: product.product_id,
          error: error.message
        });
      }
    }

    return { success, failed, errors };
  }

  async findOrCreateBrand(name, description = null) {
    let brand = await db('brands')
      .where('name', 'ilike', name)
      .first();

    if (!brand) {
      [brand] = await db('brands')
        .insert({
          name,
          description
        })
        .returning('id');
    }

    return brand.id;
  }

  async findOrCreateCategory(name, description = null) {
    let category = await db('categories')
      .where('name', 'ilike', name)
      .first();

    if (!category) {
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      [category] = await db('categories')
        .insert({
          name,
          slug,
          description
        })
        .returning('id');
    }

    return category.id;
  }

  // Helper methods for parsing CSV data
  parseJSON(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  parseFloat(value) {
    if (!value) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  parseInt(value) {
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  parseBoolean(value) {
    if (!value) return false;
    return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
  }

  parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  parseArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  parseImageUrls(value) {
    if (!value) return [];
    const urls = this.parseArray(value);
    return urls.map(url => ({ url, alt: '', primary: false }));
  }

  parseDimensions(value) {
    if (!value) return {};
    // Try to parse "10x5x2 inches" format
    const match = value.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)\s*(.+)?/i);
    if (match) {
      return {
        length: parseFloat(match[1]),
        width: parseFloat(match[2]),
        height: parseFloat(match[3]),
        unit: match[4]?.trim() || 'inches'
      };
    }
    return {};
  }

  validateAvailabilityStatus(status) {
    const validStatuses = ['in_stock', 'limited_stock', 'out_of_stock', 'discontinued'];
    return validStatuses.includes(status) ? status : 'in_stock';
  }

  generateAITags(row) {
    const tags = [];
    
    // Add category-based tags
    if (row.category) {
      tags.push(`category:${row.category.toLowerCase()}`);
    }
    
    // Add price range tags
    const price = this.parseFloat(row.price);
    if (price) {
      if (price < 50) tags.push('price:budget');
      else if (price < 200) tags.push('price:mid-range');
      else tags.push('price:premium');
    }
    
    // Add feature tags from description
    const description = (row.short_description + ' ' + row.detailed_description).toLowerCase();
    const featureKeywords = ['wireless', 'bluetooth', 'waterproof', 'portable', 'smart', 'premium', 'lightweight'];
    featureKeywords.forEach(keyword => {
      if (description.includes(keyword)) {
        tags.push(`feature:${keyword}`);
      }
    });
    
    return tags;
  }
}

module.exports = CSVImporter;