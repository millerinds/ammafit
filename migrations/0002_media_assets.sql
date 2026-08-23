CREATE TABLE IF NOT EXISTS media_assets (
  object_key TEXT PRIMARY KEY,
  product_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES produtos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_assets_product
ON media_assets(product_id);

CREATE INDEX IF NOT EXISTS idx_media_assets_status
ON media_assets(status);
