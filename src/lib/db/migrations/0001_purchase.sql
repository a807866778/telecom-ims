-- 采购模块数据库表

-- 采购订单表
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  supplier_id TEXT REFERENCES suppliers(id),
  operator_id TEXT NOT NULL REFERENCES users(id),
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '待收货',
  expected_date INTEGER,
  remark TEXT,
  photo_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 采购订单明细表
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  material_id TEXT NOT NULL REFERENCES materials(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  received_quantity REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 采购收货表
CREATE TABLE IF NOT EXISTS purchase_receipts (
  id TEXT PRIMARY KEY,
  receipt_no TEXT NOT NULL UNIQUE,
  order_id TEXT REFERENCES purchase_orders(id),
  operator_id TEXT NOT NULL REFERENCES users(id),
  total_amount REAL NOT NULL DEFAULT 0,
  remark TEXT,
  photo_url TEXT,
  created_at INTEGER NOT NULL
);

-- 采购收货明细表
CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES purchase_receipts(id),
  material_id TEXT NOT NULL REFERENCES materials(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  created_at INTEGER NOT NULL
);

-- 采购退货表
CREATE TABLE IF NOT EXISTS purchase_return_orders (
  id TEXT PRIMARY KEY,
  return_no TEXT NOT NULL UNIQUE,
  order_id TEXT REFERENCES purchase_orders(id),
  supplier_id TEXT REFERENCES suppliers(id),
  operator_id TEXT NOT NULL REFERENCES users(id),
  auditor_id TEXT REFERENCES users(id),
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '待审核',
  reason TEXT,
  photo_url TEXT,
  audit_remark TEXT,
  created_at INTEGER NOT NULL,
  audited_at INTEGER
);

-- 采购退货明细表
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES purchase_return_orders(id),
  material_id TEXT NOT NULL REFERENCES materials(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  created_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_no ON purchase_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id ON purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_material_id ON purchase_order_items(material_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_receipt_no ON purchase_receipts(receipt_no);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_order_id ON purchase_receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_created_at ON purchase_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_receipt_id ON purchase_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_orders_return_no ON purchase_return_orders(return_no);
CREATE INDEX IF NOT EXISTS idx_purchase_return_orders_status ON purchase_return_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_return_orders_created_at ON purchase_return_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return_id ON purchase_return_items(return_id);
