INSERT INTO products (id, title, body_html, status, created_at, updated_at) VALUES ('test-product-id', 'Test Product', '<p>Test Description</p>', 'draft', unixepoch(), unixepoch());
INSERT INTO product_translations (product_id, language_code, title, body_html) VALUES ('test-product-id', 'zh_CN', '测试产品', '<p>测试描述</p>');
