-- Migration number: 0003 	 2024-02-08T17:05:00.000Z

-- Disable foreign key constraints to allow dropping tables
PRAGMA foreign_keys = OFF;

-- Drop existing tables
DROP TABLE IF EXISTS product_sources;
DROP TABLE IF EXISTS product_translations;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS app_settings;

-- 1. Create Products Table (Shopify Aligned + Cost/Selling Price)
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body_html TEXT,
    vendor TEXT,
    product_type TEXT,
    status TEXT DEFAULT 'draft',
    tags TEXT,
    
    cost_price INTEGER DEFAULT 0,    -- Shiire Kakaku
    selling_price INTEGER DEFAULT 0, -- Shopify Price
    currency TEXT DEFAULT 'JPY',
    
    sku TEXT,
    inventory_quantity INTEGER DEFAULT 0,
    
    images_json TEXT,
    shopify_product_id TEXT,
    
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 2. Create Product Translations
CREATE TABLE product_translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    language_code TEXT NOT NULL,
    title TEXT,
    body_html TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, language_code)
);

-- 3. Create Product Sources (for Inventory Sync)
CREATE TABLE product_sources (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    price INTEGER,
    last_checked_at INTEGER DEFAULT (strftime('%s', 'now')),
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 4. Create App Settings (Price Calculation)
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Pre-populate default settings
INSERT INTO app_settings (key, value) VALUES 
('profit_margin', '20'),  -- 20%
('platform_fee', '10'),   -- 10%
('shipping_cost', '1000'); -- 1000 JPY

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
