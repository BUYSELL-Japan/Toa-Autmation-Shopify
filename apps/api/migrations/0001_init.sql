-- Migration number: 0001 	 2024-02-06T00:00:00.000Z

DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price REAL,
    currency TEXT DEFAULT 'JPY',
    original_url TEXT,
    sku TEXT,
    images_json TEXT, -- JSON array of image URLs
    shopify_product_id TEXT,
    status TEXT DEFAULT 'draft', -- draft, translated, uploaded
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

DROP TABLE IF EXISTS product_translations;
CREATE TABLE product_translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    language_code TEXT NOT NULL,
    title TEXT,
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS research_data;
CREATE TABLE research_data (
    id TEXT PRIMARY KEY,
    keyword TEXT,
    source TEXT,
    results_json TEXT,
    status TEXT DEFAULT 'pending', 
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
