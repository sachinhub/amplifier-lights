# API Testing Guide - AmplifiER Light

This guide provides comprehensive examples for manually testing all API endpoints in the AmplifiER Light system.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
No authentication required for public product discovery APIs. Webhook endpoints use signature verification.

---

## 1. Product Catalog APIs

### 1.1 Get All Products
```bash
# Basic request
curl -X GET "http://localhost:3000/api/v1/products"

# With filters
curl -X GET "http://localhost:3000/api/v1/products?category=electronics&limit=10&featured=true"

# AI Crawler simulation (includes JSON-LD)
curl -X GET "http://localhost:3000/api/v1/products" \
  -H "User-Agent: GPTBot/1.0"
```

**Expected Response:**
```json
{
  "products": [
    {
      "id": "TECH-PHONE-001",
      "name": "TechCorp Pro Smartphone X1",
      "description": "Premium smartphone with advanced AI features",
      "price": 999.99,
      "currency": "USD",
      "availability": {
        "status": "in_stock",
        "quantity": 150
      },
      "brand": {
        "name": "TechCorp"
      },
      "category": {
        "name": "Smartphones"
      }
    }
  ],
  "total": 1,
  "filters": {
    "limit": 50,
    "offset": 0
  },
  "jsonLD": [...] // Only for AI crawlers
}
```

### 1.2 Get Single Product
```bash
# Get specific product
curl -X GET "http://localhost:3000/api/v1/products/TECH-PHONE-001"

# AI Crawler with JSON-LD
curl -X GET "http://localhost:3000/api/v1/products/ECO-SPEAKER-001" \
  -H "User-Agent: ClaudeBot/1.0"
```

### 1.3 Search Products
```bash
# Basic search
curl -X GET "http://localhost:3000/api/v1/products/search?q=smartphone"

# Search with limit
curl -X GET "http://localhost:3000/api/v1/products/search?q=wireless&limit=5"

# Error case - query too short
curl -X GET "http://localhost:3000/api/v1/products/search?q=a"
```

### 1.4 Compare Products
```bash
# Compare multiple products
curl -X GET "http://localhost:3000/api/v1/products/compare?ids=TECH-PHONE-001,INNO-SMART-002,ECO-SPEAKER-001"

# AI Crawler comparison
curl -X GET "http://localhost:3000/api/v1/products/compare?ids=CREATIVE-HEADPHONE-001,TECH-GAMING-001" \
  -H "User-Agent: PerplexityBot/1.0"
```

### 1.5 CSV Import
```bash
# Import products from CSV
curl -X POST "http://localhost:3000/api/v1/products/import" \
  -F "csv=@sample_products.csv"
```

---

## 2. Category APIs

### 2.1 Get All Categories
```bash
curl -X GET "http://localhost:3000/api/v1/categories"
```

**Expected Response:**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and gadgets",
      "product_count": 5,
      "children": [
        {
          "id": 2,
          "name": "Smartphones",
          "slug": "smartphones",
          "product_count": 2,
          "children": []
        }
      ]
    }
  ]
}
```

### 2.2 Get Category by Slug
```bash
curl -X GET "http://localhost:3000/api/v1/categories/electronics"
curl -X GET "http://localhost:3000/api/v1/categories/gaming"
```

---

## 3. Availability APIs

### 3.1 Get Product Availability
```bash
# Get availability for single product
curl -X GET "http://localhost:3000/api/v1/availability/TECH-PHONE-001"

# Get availability by location
curl -X GET "http://localhost:3000/api/v1/availability/ECO-SPEAKER-001?location=US"
```

**Expected Response:**
```json
{
  "productId": "TECH-PHONE-001",
  "locations": [
    {
      "locationCode": "US",
      "locationName": "United States",
      "quantity": 150,
      "price": 999.99,
      "currency": "USD",
      "availabilityStatus": "in_stock",
      "deliveryEstimates": {
        "standard": "2-3 business days",
        "express": "1-2 business days"
      },
      "lastUpdated": "2025-08-25T10:30:00Z"
    }
  ],
  "globalStatus": "in_stock",
  "lastUpdated": "2025-08-25T10:30:00Z"
}
```

### 3.2 Get Bulk Availability
```bash
# Multiple products
curl -X GET "http://localhost:3000/api/v1/availability?ids=TECH-PHONE-001,ECO-SPEAKER-001,TECH-GAMING-001"

# With location filter
curl -X GET "http://localhost:3000/api/v1/availability?ids=CREATIVE-HEADPHONE-001,LIMITED-EDITION-001&location=EU"
```

### 3.3 Update Inventory
```bash
# Update single product inventory
curl -X POST "http://localhost:3000/api/v1/availability/update" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "TECH-PHONE-001",
    "updates": [
      {
        "locationCode": "US",
        "quantity": 140,
        "price": 949.99,
        "availabilityStatus": "in_stock"
      }
    ]
  }'
```

### 3.4 Bulk Update Inventory
```bash
# Update multiple products
curl -X POST "http://localhost:3000/api/v1/availability/bulk-update" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "productId": "TECH-PHONE-001",
      "updates": [
        {
          "locationCode": "US",
          "quantity": 135,
          "price": 949.99
        }
      ]
    },
    {
      "productId": "ECO-SPEAKER-001",
      "updates": [
        {
          "locationCode": "EU",
          "quantity": 60,
          "price": 169.99,
          "currency": "EUR"
        }
      ]
    }
  ]'
```

### 3.5 Get Availability Alerts
```bash
# All alerts
curl -X GET "http://localhost:3000/api/v1/availability/alerts"

# Location-specific alerts
curl -X GET "http://localhost:3000/api/v1/availability/alerts?location=US"
```

**Expected Response:**
```json
{
  "alerts": [
    {
      "id": 1,
      "productId": "LIMITED-EDITION-001",
      "productName": "TechCorp Anniversary Edition Smartphone",
      "locationCode": "US",
      "alertType": "low_stock",
      "thresholdValue": 8,
      "triggeredAt": "2025-08-25T09:30:00Z"
    }
  ],
  "count": 1,
  "location": "all",
  "timestamp": "2025-08-25T10:30:00Z"
}
```

### 3.6 Webhook Endpoint
```bash
# External inventory system webhook
curl -X POST "http://localhost:3000/api/v1/availability/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=your-signature-here" \
  -d '{
    "products": [
      {
        "id": "TECH-PHONE-001",
        "location": "US",
        "quantity": 125,
        "price": 999.99,
        "status": "in_stock"
      },
      {
        "id": "ECO-SPEAKER-001",
        "location": "EU",
        "quantity": 30,
        "price": 164.99,
        "status": "limited_stock"
      }
    ]
  }'

# Error case - missing signature
curl -X POST "http://localhost:3000/api/v1/availability/webhook" \
  -H "Content-Type: application/json" \
  -d '{"products": []}'
```

---

## 4. System Health APIs

### 4.1 Application Health
```bash
curl -X GET "http://localhost:3000/health"
```

### 4.2 Availability Engine Status
```bash
curl -X GET "http://localhost:3000/api/v1/availability/system/status"
```

### 4.3 API Version Info
```bash
curl -X GET "http://localhost:3000/api/v1"
```

---

## 5. AI Crawler Testing

### 5.1 Robots.txt
```bash
curl -X GET "http://localhost:3000/robots.txt"
```

**Expected Response:**
```
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: http://localhost:3000/ai/sitemap.xml
```

### 5.2 AI-Specific Content
```bash
# GPTBot simulation
curl -X GET "http://localhost:3000/api/v1/products/CREATIVE-HEADPHONE-001" \
  -H "User-Agent: GPTBot/1.0"

# ClaudeBot simulation  
curl -X GET "http://localhost:3000/api/v1/products?category=gaming" \
  -H "User-Agent: ClaudeBot/1.0"

# PerplexityBot simulation
curl -X GET "http://localhost:3000/api/v1/products/search?q=eco-friendly" \
  -H "User-Agent: PerplexityBot/1.0"
```

---

## 6. Error Testing

### 6.1 Validation Errors
```bash
# Invalid product search query
curl -X GET "http://localhost:3000/api/v1/products/search?q=a"

# Invalid availability update
curl -X POST "http://localhost:3000/api/v1/availability/update" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "INVALID"
  }'

# Too many comparison products
curl -X GET "http://localhost:3000/api/v1/products/compare?ids=$(printf 'PROD-%03d,' {1..15})"
```

### 6.2 Not Found Errors
```bash
# Non-existent product
curl -X GET "http://localhost:3000/api/v1/products/NON-EXISTENT"

# Non-existent category
curl -X GET "http://localhost:3000/api/v1/categories/non-existent"

# Non-existent availability
curl -X GET "http://localhost:3000/api/v1/availability/NON-EXISTENT"
```

### 6.3 Rate Limiting (requires multiple requests)
```bash
# Simulate rate limiting (run quickly multiple times)
for i in {1..110}; do
  curl -X GET "http://localhost:3000/api/v1/products" &
done
wait
```

---

## 7. Sample Data for Testing

### Products Available:
1. **TECH-PHONE-001** - TechCorp Pro Smartphone X1 ($999.99)
2. **INNO-SMART-002** - InnovateLab Smart Device Pro ($299.99)  
3. **TECH-LAPTOP-003** - TechCorp UltraBook Elite 15 ($2499.99)
4. **ECO-SPEAKER-001** - EcoTech Harmony Smart Speaker ($179.99)
5. **CREATIVE-HEADPHONE-001** - CreativeStudio Pro Monitor Headphones ($599.99)
6. **TECH-GAMING-001** - TechCorp UltraGame Wireless Controller ($149.99)
7. **INNO-CHARGER-001** - InnovateLab Wireless Charging Station Pro ($89.99)
8. **LIMITED-EDITION-001** - TechCorp Anniversary Edition Smartphone ($1599.99) - **Low Stock**

### Categories Available:
- **electronics** (parent)
  - **smartphones**  
  - **laptops**
  - **audio-music** (parent)
    - **smart-speakers**
    - **headphones**
  - **gaming**
- **accessories**

### Locations Available:
- **US** - United States
- **EU** - European Union  
- **ASIA** - Asia Pacific
- **GLOBAL** - Global Warehouse

---

## 8. Performance Testing

### Load Testing Commands
```bash
# Basic load test with Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/v1/products

# Availability endpoint load test
ab -n 500 -c 5 http://localhost:3000/api/v1/availability/TECH-PHONE-001

# Search endpoint load test
ab -n 200 -c 5 "http://localhost:3000/api/v1/products/search?q=smartphone"
```

---

## 9. Integration Testing Scenarios

### Scenario 1: Customer Product Discovery
1. Browse all products → Search for specific type → View product details → Check availability
2. Compare similar products → Check different locations → Make decision

### Scenario 2: Inventory Management
1. Check current stock levels → Receive low stock alert → Update inventory → Verify update

### Scenario 3: AI Crawler Simulation  
1. Request robots.txt → Crawl product pages → Extract JSON-LD data → Process for recommendations

### Scenario 4: External System Integration
1. Inventory system sends webhook → Process update → Trigger alerts → Update availability

---

## 10. Expected Response Times

- **Product APIs**: < 200ms
- **Availability APIs**: < 50ms for cached data, < 200ms for real-time
- **Search APIs**: < 300ms
- **Webhook Processing**: < 1000ms
- **Health Checks**: < 100ms

## 11. Monitoring and Debugging

### Logs Location
```bash
# Application logs
tail -f logs/app.log

# Error logs  
tail -f logs/error.log
```

### Health Monitoring
```bash
# Continuous health monitoring
watch -n 5 'curl -s http://localhost:3000/health | jq'

# Availability engine monitoring
watch -n 10 'curl -s http://localhost:3000/api/v1/availability/system/status | jq'
```

This guide provides comprehensive examples for testing all API functionality manually. Use these examples to verify the system works correctly and to understand the expected behavior of each endpoint.