exports.seed = async function(knex) {
  // Add more comprehensive sample data for manual testing

  // Insert additional brands
  await knex('brands').insert([
    {
      id: 3,
      name: 'EcoTech Solutions',
      description: 'Sustainable technology for modern living',
      website_url: 'https://ecotech.example.com',
      story: 'EcoTech Solutions was founded in 2018 with a mission to create environmentally friendly technology products that reduce carbon footprint while maintaining high performance.',
      contact_info: JSON.stringify({
        email: 'support@ecotech.example.com',
        phone: '+1-800-ECOTECH',
        chat: 'https://ecotech.example.com/chat'
      }),
      policies: JSON.stringify({
        return: '45-day eco-friendly return policy',
        warranty: '3-year comprehensive warranty',
        recycling: 'Free product recycling program'
      })
    },
    {
      id: 4,
      name: 'CreativeStudio Pro',
      description: 'Professional tools for creative professionals',
      website_url: 'https://creativestudio.example.com',
      story: 'CreativeStudio Pro specializes in high-end creative tools and software solutions for designers, artists, and content creators worldwide.',
      contact_info: JSON.stringify({
        email: 'hello@creativestudio.example.com',
        phone: '+1-555-CREATE',
        support: '24/7 creative support hotline'
      })
    }
  ]);

  // Insert additional categories
  await knex('categories').insert([
    {
      id: 5,
      name: 'Audio & Music',
      slug: 'audio-music',
      description: 'Professional and consumer audio equipment',
      parent_id: 1, // Electronics
      metadata: JSON.stringify({ icon: 'headphones', color: '#9c27b0' })
    },
    {
      id: 6,
      name: 'Gaming',
      slug: 'gaming',
      description: 'Gaming hardware and accessories',
      parent_id: 1, // Electronics
      metadata: JSON.stringify({ icon: 'gamepad', color: '#ff5722' })
    },
    {
      id: 7,
      name: 'Smart Speakers',
      slug: 'smart-speakers',
      description: 'Voice-activated smart speakers',
      parent_id: 5, // Audio & Music
      metadata: JSON.stringify({ icon: 'speaker', color: '#4caf50' })
    },
    {
      id: 8,
      name: 'Headphones',
      slug: 'headphones',
      description: 'Premium headphones and earbuds',
      parent_id: 5, // Audio & Music
      metadata: JSON.stringify({ icon: 'headphones', color: '#2196f3' })
    },
    {
      id: 9,
      name: 'Accessories',
      slug: 'accessories',
      description: 'Tech accessories and peripherals',
      parent_id: null,
      metadata: JSON.stringify({ icon: 'accessories', color: '#607d8b' })
    }
  ]);

  // Insert extensive product catalog
  await knex('products').insert([
    // Audio Products
    {
      id: 4,
      product_id: 'ECO-SPEAKER-001',
      name: 'EcoTech Harmony Smart Speaker',
      short_description: 'Eco-friendly smart speaker with premium sound quality and voice control',
      detailed_description: 'The EcoTech Harmony combines exceptional audio quality with environmental responsibility. Made from 90% recycled materials, this smart speaker delivers rich, room-filling sound while supporting multiple voice assistants. Features include 360-degree audio, smart home integration, and energy-efficient operation.',
      specifications: JSON.stringify({
        'Audio Output': '360-degree surround sound',
        'Power': '20W RMS, Energy Star certified',
        'Connectivity': 'WiFi 6, Bluetooth 5.2, AirPlay 2',
        'Voice Assistant': 'Alexa, Google Assistant, Siri',
        'Materials': '90% recycled ocean plastic',
        'Dimensions': '6.1" H x 4.5" D',
        'Weight': '2.1 lbs'
      }),
      use_cases: JSON.stringify([
        'Smart home control center',
        'Multi-room audio streaming',
        'Voice-activated assistance',
        'Ambient background music',
        'Podcast and audiobook playback'
      ]),
      target_audience: 'Environmentally conscious consumers and smart home enthusiasts aged 25-50',
      price: 179.99,
      currency: 'USD',
      stock_quantity: 75,
      availability_status: 'in_stock',
      images: JSON.stringify([
        { url: 'https://images.example.com/eco-speaker-main.jpg', alt: 'EcoTech Harmony front view', primary: true },
        { url: 'https://images.example.com/eco-speaker-back.jpg', alt: 'Back connectivity ports', primary: false },
        { url: 'https://images.example.com/eco-speaker-room.jpg', alt: 'In living room setting', primary: false }
      ]),
      brand_id: 3, // EcoTech Solutions
      category_id: 7, // Smart Speakers
      model: 'Harmony-2024',
      weight: 2.1,
      dimensions: JSON.stringify({
        length: 6.1,
        width: 4.5,
        height: 4.5,
        unit: 'inches'
      }),
      colors: JSON.stringify(['Ocean Blue', 'Forest Green', 'Stone Gray']),
      materials: JSON.stringify(['Recycled ocean plastic', 'Bamboo fiber', 'Bio-based foam']),
      warranty: '3 years comprehensive + lifetime recycling',
      care_instructions: 'Clean with damp microfiber cloth. Avoid harsh chemicals.',
      seo_keywords: JSON.stringify(['eco-friendly', 'smart speaker', 'voice control', 'recycled materials']),
      ai_tags: JSON.stringify(['category:smart-speaker', 'price:mid-range', 'feature:eco-friendly', 'feature:voice']),
      alternatives: JSON.stringify(['TECH-SMART-002', 'INNO-SOUND-001']),
      accessories: JSON.stringify(['ECO-MOUNT-001', 'ECO-CABLE-001']),
      avg_rating: 4.6,
      review_count: 892,
      featured: true,
      active: true
    },
    {
      id: 5,
      product_id: 'CREATIVE-HEADPHONE-001',
      name: 'CreativeStudio Pro Monitor Headphones',
      short_description: 'Professional studio-grade headphones for audio production and critical listening',
      detailed_description: 'The CreativeStudio Pro Monitor Headphones are engineered for professional audio work, featuring flat frequency response, exceptional detail retrieval, and comfort for extended listening sessions. Used by top recording studios worldwide, these headphones provide the accuracy needed for mixing, mastering, and critical listening.',
      specifications: JSON.stringify({
        'Driver Size': '50mm planar magnetic drivers',
        'Frequency Response': '10Hz - 40kHz ±1dB',
        'Impedance': '32 ohms',
        'Sensitivity': '105 dB SPL/mW',
        'THD': '<0.1% at 100dB SPL',
        'Cable': '3m detachable cable with 1/4" and 3.5mm adapters',
        'Weight': '420g'
      }),
      use_cases: JSON.stringify([
        'Professional audio mixing',
        'Mastering and post-production',
        'Critical music listening',
        'Podcast production',
        'Game audio development'
      ]),
      target_audience: 'Audio professionals, musicians, content creators, and audiophiles',
      price: 599.99,
      currency: 'USD',
      stock_quantity: 45,
      availability_status: 'in_stock',
      restock_date: null,
      images: JSON.stringify([
        { url: 'https://images.example.com/creative-headphones-main.jpg', alt: 'Professional headphones', primary: true },
        { url: 'https://images.example.com/creative-headphones-side.jpg', alt: 'Side profile view', primary: false },
        { url: 'https://images.example.com/creative-headphones-studio.jpg', alt: 'In recording studio', primary: false }
      ]),
      brand_id: 4, // CreativeStudio Pro
      category_id: 8, // Headphones
      model: 'Monitor-Pro-X1',
      weight: 0.92,
      dimensions: JSON.stringify({
        length: 8.5,
        width: 7.2,
        height: 10.1,
        unit: 'inches'
      }),
      colors: JSON.stringify(['Matte Black', 'Studio Silver']),
      materials: JSON.stringify(['Aluminum alloy', 'Memory foam padding', 'Protein leather']),
      warranty: '5 years professional warranty',
      care_instructions: 'Store in provided case. Clean pads with gentle leather cleaner.',
      seo_keywords: JSON.stringify(['professional headphones', 'studio monitors', 'audio production', 'planar magnetic']),
      ai_tags: JSON.stringify(['category:headphones', 'price:premium', 'feature:professional', 'feature:studio']),
      alternatives: JSON.stringify(['AUDIO-PRO-002', 'STUDIO-MON-001']),
      accessories: JSON.stringify(['CREATIVE-CASE-001', 'CREATIVE-STAND-001', 'CREATIVE-CABLE-KIT']),
      avg_rating: 4.8,
      review_count: 324,
      featured: true,
      active: true
    },
    // Gaming Products
    {
      id: 6,
      product_id: 'TECH-GAMING-001',
      name: 'TechCorp UltraGame Wireless Controller',
      short_description: 'Premium wireless gaming controller with haptic feedback and 40-hour battery life',
      detailed_description: 'The TechCorp UltraGame Controller redefines gaming precision with advanced haptic feedback, adaptive triggers, and ultra-low latency wireless connectivity. Compatible with PC, mobile, and cloud gaming platforms, it features customizable RGB lighting, programmable buttons, and an industry-leading 40-hour battery life.',
      specifications: JSON.stringify({
        'Connectivity': '2.4GHz wireless, Bluetooth 5.2, USB-C',
        'Battery Life': '40 hours continuous play',
        'Charging': 'USB-C fast charging, 2 hours full charge',
        'Haptic Feedback': 'HD Rumble with precise vibration',
        'Triggers': 'Adaptive trigger resistance',
        'Compatibility': 'PC, Android, iOS, Nintendo Switch',
        'RGB Lighting': '16.7 million colors, customizable zones'
      }),
      use_cases: JSON.stringify([
        'Competitive gaming',
        'Console gaming',
        'PC gaming',
        'Mobile gaming',
        'Cloud gaming streaming'
      ]),
      target_audience: 'Gamers aged 13-35, esports enthusiasts, and casual players',
      price: 149.99,
      currency: 'USD',
      stock_quantity: 200,
      availability_status: 'in_stock',
      images: JSON.stringify([
        { url: 'https://images.example.com/gaming-controller-main.jpg', alt: 'Gaming controller front', primary: true },
        { url: 'https://images.example.com/gaming-controller-rgb.jpg', alt: 'RGB lighting effects', primary: false },
        { url: 'https://images.example.com/gaming-controller-setup.jpg', alt: 'Gaming setup', primary: false }
      ]),
      brand_id: 1, // TechCorp
      category_id: 6, // Gaming
      model: 'UltraGame-Pro',
      weight: 0.6,
      dimensions: JSON.stringify({
        length: 6.2,
        width: 4.1,
        height: 2.5,
        unit: 'inches'
      }),
      colors: JSON.stringify(['Midnight Black', 'Arctic White', 'Cosmic Purple', 'Electric Blue']),
      materials: JSON.stringify(['ABS plastic', 'Textured grips', 'Premium buttons']),
      warranty: '2 years gaming warranty',
      care_instructions: 'Wipe with dry cloth. Avoid moisture near charging port.',
      seo_keywords: JSON.stringify(['gaming controller', 'wireless', 'haptic feedback', 'long battery']),
      ai_tags: JSON.stringify(['category:gaming', 'price:mid-range', 'feature:wireless', 'feature:long-battery']),
      alternatives: JSON.stringify(['GAME-CONTROL-002', 'PRO-GAME-001']),
      accessories: JSON.stringify(['TECH-DOCK-002', 'TECH-CASE-CONTROLLER', 'TECH-CABLE-USB-C']),
      avg_rating: 4.7,
      review_count: 1567,
      featured: true,
      active: true
    },
    // Accessory Products
    {
      id: 7,
      product_id: 'INNO-CHARGER-001',
      name: 'InnovateLab Wireless Charging Station Pro',
      short_description: 'Multi-device wireless charging station with fast charging and device organization',
      detailed_description: 'The InnovateLab Wireless Charging Station Pro simultaneously charges up to 4 devices wirelessly while keeping your workspace organized. Features 15W fast wireless charging, foreign object detection, and smart LED indicators. Compatible with all Qi-enabled devices including phones, earbuds, and smartwatches.',
      specifications: JSON.stringify({
        'Charging Zones': '4 independent Qi charging zones',
        'Power Output': '15W max per zone (60W total)',
        'Compatibility': 'All Qi-enabled devices',
        'Safety': 'FOD, overvoltage, temperature protection',
        'Indicators': 'Smart LED status lights',
        'Input': 'USB-C PD 65W adapter included',
        'Materials': 'Premium aluminum and tempered glass'
      }),
      use_cases: JSON.stringify([
        'Office desk organization',
        'Bedside charging station',
        'Conference room setup',
        'Multi-device households',
        'Retail and hospitality'
      ]),
      target_audience: 'Tech-savvy professionals and organized households',
      price: 89.99,
      currency: 'USD',
      stock_quantity: 150,
      availability_status: 'in_stock',
      images: JSON.stringify([
        { url: 'https://images.example.com/wireless-charger-main.jpg', alt: 'Wireless charging station', primary: true },
        { url: 'https://images.example.com/wireless-charger-devices.jpg', alt: 'Multiple devices charging', primary: false },
        { url: 'https://images.example.com/wireless-charger-office.jpg', alt: 'Office desk setup', primary: false }
      ]),
      brand_id: 2, // InnovateLab
      category_id: 9, // Accessories
      model: 'ChargePro-4X',
      weight: 1.8,
      dimensions: JSON.stringify({
        length: 12.0,
        width: 8.0,
        height: 1.2,
        unit: 'inches'
      }),
      colors: JSON.stringify(['Space Gray', 'Silver', 'Rose Gold']),
      materials: JSON.stringify(['Aluminum alloy', 'Tempered glass', 'Silicone base']),
      warranty: '2 years limited warranty',
      care_instructions: 'Clean glass surface with microfiber cloth. Ensure proper ventilation.',
      seo_keywords: JSON.stringify(['wireless charging', 'multi device', 'fast charging', 'desk organizer']),
      ai_tags: JSON.stringify(['category:accessory', 'price:budget', 'feature:wireless', 'feature:multi-device']),
      alternatives: JSON.stringify(['CHARGE-MULTI-001', 'WIRELESS-PRO-002']),
      accessories: JSON.stringify(['INNO-ADAPTER-65W', 'INNO-CABLE-LONG']),
      avg_rating: 4.4,
      review_count: 756,
      featured: false,
      active: true
    },
    // Limited Stock Product
    {
      id: 8,
      product_id: 'LIMITED-EDITION-001',
      name: 'TechCorp Anniversary Edition Smartphone',
      short_description: 'Limited edition smartphone commemorating TechCorp\'s 15th anniversary',
      detailed_description: 'A rare collector\'s item featuring premium materials, custom anniversary design, and exclusive software features. Only 1000 units produced worldwide, each with a certificate of authenticity and special packaging. Includes all Pro Smartphone X1 features plus exclusive anniversary wallpapers and themes.',
      specifications: JSON.stringify({
        'Display': '6.7" OLED Anniversary Edition, 120Hz',
        'Back Panel': 'Titanium with laser-etched anniversary logo',
        'Camera': '108MP anniversary camera with special filters',
        'RAM': '16GB',
        'Storage': '512GB',
        'Special Features': 'Exclusive anniversary software package',
        'Packaging': 'Premium wooden box with certificate'
      }),
      use_cases: JSON.stringify([
        'Collector\'s item',
        'Premium mobile experience',
        'Corporate gifts',
        'Technology enthusiast showcase',
        'Investment piece'
      ]),
      target_audience: 'Collectors, tech enthusiasts, and premium users',
      price: 1599.99,
      currency: 'USD',
      stock_quantity: 8,
      availability_status: 'limited_stock',
      restock_date: null, // No restock planned
      images: JSON.stringify([
        { url: 'https://images.example.com/anniversary-phone-main.jpg', alt: 'Anniversary edition front', primary: true },
        { url: 'https://images.example.com/anniversary-phone-back.jpg', alt: 'Titanium back with logo', primary: false },
        { url: 'https://images.example.com/anniversary-phone-box.jpg', alt: 'Premium wooden packaging', primary: false }
      ]),
      brand_id: 1, // TechCorp
      category_id: 2, // Smartphones
      model: 'Anniversary-X1-Limited',
      weight: 0.195,
      dimensions: JSON.stringify({
        length: 6.2,
        width: 2.9,
        height: 0.3,
        unit: 'inches'
      }),
      colors: JSON.stringify(['Anniversary Titanium (Exclusive)']),
      materials: JSON.stringify(['Titanium frame', 'Sapphire crystal', 'Premium leather accents']),
      warranty: '3 years premium collector warranty',
      care_instructions: 'Handle with care. Use provided microfiber cloth and leather care kit.',
      seo_keywords: JSON.stringify(['limited edition', 'anniversary', 'collector', 'premium smartphone']),
      ai_tags: JSON.stringify(['category:smartphone', 'price:luxury', 'feature:limited', 'feature:collector']),
      alternatives: JSON.stringify(['TECH-PHONE-001']),
      accessories: JSON.stringify(['LIMITED-CASE-001', 'LIMITED-CHARGER-001', 'COLLECTOR-STAND-001']),
      avg_rating: 4.9,
      review_count: 47,
      featured: true,
      active: true
    }
  ]);

  // Add more inventory snapshots for extended products
  await knex('inventory_snapshots').insert([
    // EcoTech Harmony Smart Speaker
    {
      product_id: 4,
      location_id: 1, // US
      quantity: 75,
      price: 179.99,
      currency: 'USD',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '2-4 business days',
        express: '1-2 business days',
        eco_shipping: '5-7 business days (carbon neutral)'
      }),
      threshold_low: 20,
      threshold_critical: 5
    },
    {
      product_id: 4,
      location_id: 2, // EU
      quantity: 42,
      price: 164.99,
      currency: 'EUR',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '3-5 business days',
        express: '2-3 business days'
      }),
      threshold_low: 15,
      threshold_critical: 5
    },
    // CreativeStudio Pro Monitor Headphones
    {
      product_id: 5,
      location_id: 1, // US
      quantity: 45,
      price: 599.99,
      currency: 'USD',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '3-5 business days',
        express: '2-3 business days',
        pro_delivery: '1-2 business days (signature required)'
      }),
      threshold_low: 10,
      threshold_critical: 3
    },
    {
      product_id: 5,
      location_id: 2, // EU
      quantity: 23,
      price: 549.99,
      currency: 'EUR',
      availability_status: 'limited_stock',
      restock_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
      delivery_estimates: JSON.stringify({
        standard: '4-6 business days',
        express: '3-4 business days'
      }),
      threshold_low: 25,
      threshold_critical: 5
    },
    // TechCorp UltraGame Controller
    {
      product_id: 6,
      location_id: 1, // US
      quantity: 200,
      price: 149.99,
      currency: 'USD',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '2-3 business days',
        express: '1-2 business days',
        same_day: 'Same day (select cities)'
      }),
      threshold_low: 50,
      threshold_critical: 20
    },
    {
      product_id: 6,
      location_id: 3, // ASIA
      quantity: 156,
      price: 149.99,
      currency: 'USD',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '4-7 business days',
        express: '3-4 business days'
      }),
      threshold_low: 30,
      threshold_critical: 10
    },
    // InnovateLab Wireless Charging Station
    {
      product_id: 7,
      location_id: 4, // Global
      quantity: 150,
      price: 89.99,
      currency: 'USD',
      availability_status: 'in_stock',
      delivery_estimates: JSON.stringify({
        standard: '3-7 business days',
        express: '2-4 business days'
      }),
      threshold_low: 30,
      threshold_critical: 10
    },
    // Limited Edition - Very low stock
    {
      product_id: 8,
      location_id: 1, // US
      quantity: 8,
      price: 1599.99,
      currency: 'USD',
      availability_status: 'limited_stock',
      delivery_estimates: JSON.stringify({
        collector: '5-7 business days (white glove service)',
        insured: '3-5 business days (fully insured)'
      }),
      threshold_low: 15,
      threshold_critical: 5
    }
  ]);

  // Add more price history for testing
  await knex('price_history').insert([
    {
      product_id: 4, // EcoTech Speaker
      location_id: 1,
      old_price: 199.99,
      new_price: 179.99,
      currency: 'USD',
      change_reason: 'eco_promotion',
      metadata: JSON.stringify({
        change_percentage: -10.0,
        promotion: 'Earth Day Special',
        valid_until: '2025-04-30'
      }),
      effective_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
    },
    {
      product_id: 6, // Gaming Controller
      location_id: 1,
      old_price: 169.99,
      new_price: 149.99,
      currency: 'USD',
      change_reason: 'competitive_pricing',
      metadata: JSON.stringify({
        change_percentage: -11.76,
        reason: 'Market competition adjustment'
      }),
      effective_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    }
  ]);

  // Add more alerts for testing
  await knex('availability_alerts').insert([
    {
      product_id: 5, // Creative Headphones
      location_id: 2, // EU
      alert_type: 'low_stock',
      threshold_value: 23,
      alert_data: JSON.stringify({
        threshold: 25,
        current_quantity: 23,
        demand_trend: 'increasing'
      }),
      triggered_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      processed: false
    },
    {
      product_id: 8, // Limited Edition
      location_id: 1, // US
      alert_type: 'low_stock',
      threshold_value: 8,
      alert_data: JSON.stringify({
        threshold: 15,
        current_quantity: 8,
        collector_item: true,
        no_restock_planned: true
      }),
      triggered_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      processed: false
    }
  ]);

  // Reset sequences
  await knex.raw("SELECT setval('brands_id_seq', (SELECT MAX(id) FROM brands))");
  await knex.raw("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))");
  await knex.raw("SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))");
  await knex.raw("SELECT setval('inventory_snapshots_id_seq', (SELECT MAX(id) FROM inventory_snapshots))");
};