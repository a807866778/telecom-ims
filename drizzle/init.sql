-- Inbound Records
CREATE TABLE IF NOT EXISTS inbound_records (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES suppliers(id),
  operator_id TEXT NOT NULL REFERENCES users(id),
  total_amount REAL NOT NULL DEFAULT 0,
  remark TEXT,
  photo_url TEXT,
  created_at INTEGER NOT NULL
);

-- Inbound Items
CREATE TABLE IF NOT EXISTS inbound_items (
  id TEXT PRIMARY KEY,
  inbound_id TEXT NOT NULL REFERENCES inbound_records(id),
  material_id TEXT NOT NULL REFERENCES materials(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  created_at INTEGER NOT NULL
);
