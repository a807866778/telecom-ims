-- D1 数据库初始化脚本
-- 运行方式: wrangler d1 execute project-inventory --file=./drizzle/seed.sql --remote

-- 角色表
INSERT INTO roles (id, name, permissions, is_default, created_at) VALUES
('role-admin', '超级管理员', '["material:view","material:create","material:update","material:delete","inbound:view","inbound:create","inbound:delete","outbound:view","outbound:create","outbound:delete","project:view","project:create","project:update","project:delete","supplier:view","supplier:create","supplier:update","supplier:delete","report:view","settings:view","user:manage","role:manage"]', 0, 1704067200000),
('role-cangguan', '仓管', '["material:view","material:create","material:update","inbound:view","inbound:create","inbound:delete","project:view","supplier:view","supplier:create"]', 0, 1704067200000),
('role-xiaoshou', '销售', '["material:view","outbound:view","outbound:create","project:view","project:create","report:view"]', 0, 1704067200000),
('role-caigou', '采购', '["material:view","inbound:view","inbound:create","supplier:view","supplier:create","supplier:update"]', 0, 1704067200000),
('role-shigong', '施工员', '["material:view","outbound:view","outbound:create","project:view"]', 0, 1704067200000),
('role-xiangmu', '项目经理', '["material:view","material:create","inbound:view","outbound:view","outbound:create","project:view","project:create","project:update","report:view"]', 0, 1704067200000);

-- 用户表 (bcrypt hash for "admin123": $2a$10$SwHTfUigXwNmhNLTcZKo9eB6rdJ2K8umcsWXgrCEFjCdU5hhFu.bO)
-- 用户表 (bcrypt hash for "123456": $2a$10$l.mfKuhFCFBwTsSMoD1//OE0xcWzhbwKAVFjMhUpHMcLt3ekP0TKS)
INSERT INTO users (id, username, password_hash, real_name, created_at) VALUES
('user-admin', 'admin', '$2a$10$SwHTfUigXwNmhNLTcZKo9eB6rdJ2K8umcsWXgrCEFjCdU5hhFu.bO', '系统管理员', 1704067200000),
('user-cangguan', 'cangguan', '$2a$10$l.mfKuhFCFBwTsSMoD1//OE0xcWzhbwKAVFjMhUpHMcLt3ekP0TKS', '仓管员', 1704067200000),
('user-xiaoshou', 'xiaoshou', '$2a$10$l.mfKuhFCFBwTsSMoD1//OE0xcWzhbwKAVFjMhUpHMcLt3ekP0TKS', '销售人员', 1704067200000),
('user-caigou', 'caigou', '$2a$10$l.mfKuhFCFBwTsSMoD1//OE0xcWzhbwKAVFjMhUpHMcLt3ekP0TKS', '采购员', 1704067200000),
('user-shigong', 'shigong', '$2a$10$l.mfKuhFCFBwTsSMoD1//OE0xcWzhbwKAVFjMhUpHMcLt3ekP0TKS', '施工员', 1704067200000),
('user-xiangmu', 'xiangmu', '$2a$10$l.mfKuhFCFBwTsSMoD1//OE0xcWzhbwKAVFjMhUpHMcLt3ekP0TKS', '项目经理', 1704067200000);

-- 用户角色关联表
INSERT INTO user_roles (id, user_id, role_id) VALUES
('ur-1', 'user-admin', 'role-admin'),
('ur-2', 'user-cangguan', 'role-cangguan'),
('ur-3', 'user-xiaoshou', 'role-xiaoshou'),
('ur-4', 'user-caigou', 'role-caigou'),
('ur-5', 'user-shigong', 'role-shigong'),
('ur-6', 'user-xiangmu', 'role-xiangmu');

-- 物料分类表
INSERT INTO categories (id, name, parent_id, sort) VALUES
('cat-1', '光缆类', NULL, 1),
('cat-2', '设备类', NULL, 2),
('cat-3', '辅材类', NULL, 3),
('cat-4', '工具类', NULL, 4);

-- 物料表
INSERT INTO materials (id, name, category_id, unit, spec, purchase_price, sale_price, stock_quantity, min_stock_warning, created_at, updated_at) VALUES
('mat-1', '单模光缆', 'cat-1', '米', 'GYTA-4芯', 3.5, 6, 500, 20, 1704067200000, 1704067200000),
('mat-2', '单模光缆', 'cat-1', '米', 'GYTA-8芯', 5, 8.5, 300, 20, 1704067200000, 1704067200000),
('mat-3', '单模光缆', 'cat-1', '米', 'GYTA-12芯', 7, 12, 200, 20, 1704067200000, 1704067200000),
('mat-4', '双绞线', 'cat-1', '米', 'CAT6', 2, 4, 1000, 50, 1704067200000, 1704067200000),
('mat-5', '网络摄像机', 'cat-2', '台', '400万像素-枪机', 180, 320, 50, 10, 1704067200000, 1704067200000),
('mat-6', '网络摄像机', 'cat-2', '台', '400万像素-球机', 350, 580, 30, 5, 1704067200000, 1704067200000),
('mat-7', '网络摄像机', 'cat-2', '台', '800万像素-枪机', 280, 480, 40, 10, 1704067200000, 1704067200000),
('mat-8', '交换机', 'cat-2', '台', '8口POE', 220, 380, 60, 10, 1704067200000, 1704067200000),
('mat-9', '交换机', 'cat-2', '台', '16口POE', 450, 750, 30, 5, 1704067200000, 1704067200000),
('mat-10', '硬盘录像机', 'cat-2', '台', '8路NVR', 380, 650, 25, 5, 1704067200000, 1704067200000),
('mat-11', '光缆接头盒', 'cat-3', '个', '12芯', 35, 65, 100, 20, 1704067200000, 1704067200000),
('mat-12', '光缆接头盒', 'cat-3', '个', '24芯', 55, 95, 80, 20, 1704067200000, 1704067200000),
('mat-13', '尾纤', 'cat-3', '条', 'SC/UPC-3米', 8, 15, 200, 50, 1704067200000, 1704067200000),
('mat-14', '光纤跳线', 'cat-3', '条', 'SC/UPC-SC/UPC-5米', 15, 28, 150, 30, 1704067200000, 1704067200000),
('mat-15', '电源线', 'cat-3', '米', 'RVV2*1.0', 3, 5.5, 500, 100, 1704067200000, 1704067200000),
('mat-16', '网线', 'cat-3', '米', 'CAT6户外防水', 4, 7, 300, 50, 1704067200000, 1704067200000);

-- 供应商表
INSERT INTO suppliers (id, name, contact_person, phone, address, remark, created_at) VALUES
('sup-1', '杭州华光光缆有限公司', '张经理', '138-0001-0001', '杭州市西湖区', NULL, 1704067200000),
('sup-2', '深圳海康威视经销商', '李经理', '138-0002-0002', '深圳市南山区', NULL, 1704067200000),
('sup-3', '上海通用辅材供应商', '王经理', '138-0003-0003', '上海市浦东新区', NULL, 1704067200000);

-- 项目表
INSERT INTO projects (id, name, client_name, contact_phone, address, status, start_date, end_date, total_revenue, total_cost, total_profit, created_at) VALUES
('proj-1', 'XX小区光纤改造工程', 'XX物业管理有限公司', '138-1234-5678', '杭州市XX区XX路XX小区', '进行中', 1704067200000, NULL, 0, 0, 0, 1704067200000),
('proj-2', 'YY工业园监控安装项目', 'YY工业园管理委员会', '139-2345-6789', '苏州市YY工业园', '进行中', 1704326400000, NULL, 0, 0, 0, 1704326400000),
('proj-3', 'ZZ学校智慧校园项目', 'ZZ学校', '137-3456-7890', '上海市ZZ区ZZ路100号', '已完成', 1704067200000, 1704326400000, 50000, 35000, 15000, 1704067200000);
