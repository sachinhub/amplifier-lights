exports.seed = async function(knex) {
  // Clean up existing data
  await knex('product_search_index').del();
  await knex('products').del();
  await knex('categories').del();
  await knex('brands').del();

  // Insert brands
  await knex('brands').insert([
    {
      id: 1,
      name: 'TechCorp',
      description: 'Leading technology brand',
      website_url: 'https://techcorp.com',
      story: 'Founded in 2010, TechCorp has been at the forefront of innovation.',
      contact_info: JSON.stringify({
        email: 'support@techcorp.com',
        phone: '+1-800-TECHCORP'
      }),
      policies: JSON.stringify({
        return: '30-day return policy',
        warranty: '2-year warranty on all products'
      })
    },
    {
      id: 2,
      name: 'InnovateLab',
      description: 'Innovative solutions for modern lifestyle',
      website_url: 'https://innovatelab.com',
      story: 'InnovateLab creates cutting-edge products for the digital age.'
    }
  ]);

  // Insert categories
  await knex('categories').insert([
    {
      id: 1,
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      parent_id: null,
      metadata: JSON.stringify({ icon: 'electronics' })
    },
    {
      id: 2,
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Mobile phones and accessories',
      parent_id: 1,
      metadata: JSON.stringify({ icon: 'smartphone' })
    },
    {
      id: 3,
      name: 'Laptops',
      slug: 'laptops',
      description: 'Portable computers',
      parent_id: 1,
      metadata: JSON.stringify({ icon: 'laptop' })
    },
    {
      id: 4,
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Home improvement and garden supplies',
      parent_id: null,
      metadata: JSON.stringify({ icon: 'home' })
    }
  ]);

  // Insert sample products
  await knex('products').insert([
    {
      id: 1,
      product_id: 'TECH-PHONE-001',
      name: 'TechCorp Pro Smartphone X1',
      short_description: 'Premium smartphone with advanced AI features and 5G connectivity',
      detailed_description: 'The TechCorp Pro Smartphone X1 combines cutting-edge technology with elegant design. Features include a 6.7-inch OLED display, 108MP camera system, 12GB RAM, 256GB storage, and all-day battery life. Perfect for professionals and tech enthusiasts who demand the best.',
      specifications: JSON.stringify({
        'Display': '6.7" OLED, 120Hz',
        'Camera': '108MP main, 12MP ultra-wide, 8MP telephoto',
        'RAM': '12GB',
        'Storage': '256GB',
        'Battery': '4500mAh',
        'OS': 'Android 14',
        'Connectivity': '5G, WiFi 6E, Bluetooth 5.3',
        'Weight': '185g'
      }),
      use_cases: JSON.stringify([
        'Professional photography',
        'Business communications',
        'Gaming and entertainment',
        'Content creation',
        'Daily productivity'
      ]),
      target_audience: 'Tech professionals, content creators, and power users aged 25-45',
      price: 999.99,
      currency: 'USD',
      stock_quantity: 150,
      availability_status: 'in_stock',
      images: JSON.stringify([
        { url: 'https://example.com/phone-x1-front.jpg', alt: 'Front view', primary: true },
        { url: 'https://example.com/phone-x1-back.jpg', alt: 'Back view', primary: false },
        { url: 'https://example.com/phone-x1-side.jpg', alt: 'Side view', primary: false }
      ]),
      brand_id: 1,
      category_id: 2,
      model: 'X1',
      weight: 0.185,
      dimensions: JSON.stringify({
        length: 6.2,
        width: 2.9,
        height: 0.3,
        unit: 'inches'
      }),
      colors: JSON.stringify(['Midnight Black', 'Pearl White', 'Ocean Blue']),
      sizes: JSON.stringify(['128GB', '256GB', '512GB']),
      materials: JSON.stringify(['Aluminum frame', 'Gorilla Glass Victus', 'Ceramic back']),
      warranty: '2 years manufacturer warranty',
      care_instructions: 'Clean with soft, lint-free cloth. Avoid exposure to liquids.',
      seo_keywords: JSON.stringify(['smartphone', '5G', 'premium', 'AI camera', 'TechCorp']),
      ai_tags: JSON.stringify(['category:smartphone', 'price:premium', 'feature:5G', 'feature:AI']),
      alternatives: JSON.stringify(['INNO-SMART-002', 'TECH-PHONE-002']),
      accessories: JSON.stringify(['TECH-CASE-001', 'TECH-CHARGER-001']),
      avg_rating: 4.7,
      review_count: 2847,
      featured: true,
      active: true
    },
    {
      id: 2,
      product_id: 'INNO-SMART-002',
      name: 'InnovateLab Smart Device Pro',
      short_description: 'Innovative smart device with IoT integration and voice control',
      detailed_description: 'The InnovateLab Smart Device Pro revolutionizes home automation with advanced IoT capabilities, voice control, and seamless integration with popular smart home ecosystems. Control your entire home environment with simple voice commands or through the intuitive mobile app.',
      specifications: JSON.stringify({
        'Connectivity': 'WiFi 6, Zigbee, Thread',
        'Voice Assistant': 'Built-in Alexa & Google Assistant',
        'Hub Capacity': 'Up to 100 connected devices',
        'Display': '5" touchscreen',
        'Audio': '360-degree speakers',
        'Power': 'AC adapter with battery backup',
        'Dimensions': '6" x 4" x 2"'
      }),
      use_cases: JSON.stringify([
        'Home automation control',
        'Smart security management',
        'Entertainment system hub',
        'Energy monitoring',
        'Voice-controlled assistance'
      ]),
      target_audience: 'Smart home enthusiasts, families, and tech-savvy homeowners aged 30-55',
      price: 299.99,
      currency: 'USD',
      stock_quantity: 87,
      availability_status: 'in_stock',
      images: JSON.stringify([
        { url: 'https://example.com/smart-device-main.jpg', alt: 'Main view', primary: true },
        { url: 'https://example.com/smart-device-app.jpg', alt: 'App interface', primary: false }
      ]),
      brand_id: 2,
      category_id: 1,
      model: 'SPro-v2',
      weight: 1.2,
      dimensions: JSON.stringify({
        length: 6,
        width: 4,
        height: 2,
        unit: 'inches'
      }),
      colors: JSON.stringify(['Matte Black', 'Pure White']),
      materials: JSON.stringify(['Recycled aluminum', 'Tempered glass', 'Fabric mesh']),
      warranty: '1 year warranty with extended support',
      care_instructions: 'Dust regularly with dry cloth. Keep away from direct sunlight.',
      seo_keywords: JSON.stringify(['smart home', 'IoT', 'voice control', 'automation']),
      ai_tags: JSON.stringify(['category:smart-home', 'price:mid-range', 'feature:voice', 'feature:IoT']),
      alternatives: JSON.stringify(['TECH-PHONE-001']),
      accessories: JSON.stringify(['INNO-MOUNT-001', 'INNO-SENSOR-KIT']),
      avg_rating: 4.3,
      review_count: 1456,
      featured: false,
      active: true
    },
    {
      id: 3,
      product_id: 'TECH-LAPTOP-003',
      name: 'TechCorp UltraBook Elite 15',
      short_description: 'High-performance laptop for professionals with 15-hour battery life',
      detailed_description: 'The TechCorp UltraBook Elite 15 delivers exceptional performance for demanding professionals. With the latest Intel processor, 32GB RAM, 1TB SSD, and a stunning 4K display, this laptop handles everything from video editing to data analysis with ease. The premium build quality and 15-hour battery life make it perfect for work and travel.',
      specifications: JSON.stringify({
        'Processor': 'Intel Core i7-13700H',
        'RAM': '32GB DDR5',
        'Storage': '1TB NVMe SSD',
        'Display': '15.6" 4K OLED Touch',
        'Graphics': 'NVIDIA RTX 4060 8GB',
        'Battery': '15+ hours',
        'Weight': '3.2 lbs',
        'Ports': '2x USB-C, 2x USB-A, HDMI, SD card'
      }),
      use_cases: JSON.stringify([
        'Professional video editing',
        'Software development',
        'Data analysis and modeling',
        'Business presentations',
        'Creative design work'
      ]),
      target_audience: 'Business professionals, developers, and content creators aged 25-50',
      price: 2499.99,
      currency: 'USD',
      stock_quantity: 23,
      availability_status: 'limited_stock',
      images: JSON.stringify([
        { url: 'https://example.com/laptop-elite-open.jpg', alt: 'Laptop open', primary: true },
        { url: 'https://example.com/laptop-elite-closed.jpg', alt: 'Laptop closed', primary: false }
      ]),
      brand_id: 1,
      category_id: 3,
      model: 'Elite-15-2024',
      weight: 3.2,
      dimensions: JSON.stringify({
        length: 13.9,
        width: 9.6,
        height: 0.7,
        unit: 'inches'
      }),
      colors: JSON.stringify(['Space Gray', 'Silver']),
      materials: JSON.stringify(['Aluminum unibody', 'Carbon fiber lid']),
      warranty: '3 years premium warranty',
      care_instructions: 'Use laptop sleeve when traveling. Clean screen with microfiber cloth.',
      seo_keywords: JSON.stringify(['laptop', 'professional', '4K', 'high-performance']),
      ai_tags: JSON.stringify(['category:laptop', 'price:premium', 'feature:4K', 'feature:long-battery']),
      alternatives: JSON.stringify(['INNO-LAPTOP-004']),
      accessories: JSON.stringify(['TECH-BAG-001', 'TECH-DOCK-001', 'TECH-MOUSE-001']),
      avg_rating: 4.8,
      review_count: 892,
      featured: true,
      active: true
    }
  ]);

  // Reset sequences
  await knex.raw("SELECT setval('brands_id_seq', (SELECT MAX(id) FROM brands))");
  await knex.raw("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))");
  await knex.raw("SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))");
};