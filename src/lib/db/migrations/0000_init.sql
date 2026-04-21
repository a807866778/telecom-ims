-- 项目进存销管理系统数据库初始化

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  real_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES roles(id)
);

-- 物料分类表
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  sort INTEGER DEFAULT 0
);

-- 物料台账表
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  unit TEXT NOT NULL,
  spec TEXT,
  purchase_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  stock_quantity REAL NOT NULL DEFAULT 0,
  min_stock_warning REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  remark TEXT,
  created_at INTEGER NOT NULL
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT,
  contact_phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT '进行中',
  start_date INTEGER,
  end_date INTEGER,
  total_revenue REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  total_profit REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 入库记录表
CREATE TABLE IF NOT EXISTS inbound_records (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES suppliers(id),
  operator_id TEXT NOT NULL REFERENCES users(id),
  total_amount REAL NOT NULL DEFAULT 0,
  remark TEXT,
  photo_url TEXT,
  created_at INTEGER NOT NULL
);

-- 入库明细表
CREATE TABLE IF NOT EXISTS inbound_items (
  id TEXT PRIMARY KEY,
  inbound_id TEXT NOT NULL REFERENCES inbound_records(id),
  material_id TEXT NOT NULL REFERENCES materials(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  created_at INTEGER NOT NULL
);

-- 出库记录表
CREATE TABLE IF NOT EXISTS outbound_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  operator_id TEXT NOT NULL REFERENCES users(id),
  total_amount REAL NOT NULL DEFAULT 0,
  remark TEXT,
  photo_url TEXT,
  created_at INTEGER NOT NULL
);

-- 出库明细表
CREATE TABLE IF NOT EXISTS outbound_items (
  id TEXT PRIMARY KEY,
  outbound_id TEXT NOT NULL REFERENCES outbound_records(id),
  material_id TEXT NOT NULL REFERENCES materials(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  created_at INTEGER NOT NULL
);

-- 工具借用表
CREATE TABLE IF NOT EXISTS tool_borrows (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL REFERENCES materials(id),
  borrower_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  borrow_date INTEGER NOT NULL,
  return_date INTEGER,
  status TEXT NOT NULL DEFAULT '借用中'
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_inbound_records_created_at ON inbound_records(created_at);
CREATE INDEX IF NOT EXISTS idx_outbound_records_created_at ON outbound_records(created_at);
CREATE INDEX IF NOT EXISTS idx_outbound_records_project_id ON outbound_records(project_id);
