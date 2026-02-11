-- Migration number: 0002 	 2024-02-08T10:30:00.000Z

-- This migration is superseded by 0003_schema_update.sql
-- Commenting out to fix duplicate column errors during migration retry

-- ALTER TABLE products ADD COLUMN body_html TEXT;
-- ALTER TABLE products ADD COLUMN vendor TEXT;
-- ALTER TABLE products ADD COLUMN product_type TEXT;

-- CREATE TABLE product_sources (
--     id TEXT PRIMARY KEY,
--     product_id TEXT NOT NULL,
--     url TEXT NOT NULL,
--     source_type TEXT NOT NULL, -- 'mercari', 'amazon', 'rakuten', etc.
--     status TEXT DEFAULT 'active', -- 'active', 'sold_out', 'deleted'
--     price INTEGER,
--     last_checked_at INTEGER DEFAULT (strftime('%s', 'now')),
--     created_at INTEGER DEFAULT (strftime('%s', 'now')),
--     FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
-- );

-- CREATE INDEX idx_product_sources_product_id ON product_sources(product_id);
-- CREATE INDEX idx_product_sources_status ON product_sources(status);
