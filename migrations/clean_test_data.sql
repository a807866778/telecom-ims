-- 清空测试数据，保留管理员账户
-- 执行前请确保有备份

PRAGMA foreign_keys = OFF;

-- 业务数据表（按依赖顺序）
DELETE FROM training_records;
DELETE FROM training_exams;
DELETE FROM training_modules;
DELETE FROM training_videos;
DELETE FROM notifications;
DELETE FROM user_notifications;
DELETE FROM todos;
DELETE FROM after_sales;
DELETE FROM complaints;
DELETE FROM staff_health;
DELETE FROM staff_licenses;
DELETE FROM staff;
DELETE FROM project_contracts;
DELETE FROM return_items;
DELETE FROM return_records;
DELETE FROM outbound_items;
DELETE FROM outbound_records;
DELETE FROM stock_flow;
DELETE FROM inbound_items;
DELETE FROM inbound_records;
DELETE FROM stock_check_items;
DELETE FROM stock_checks;
DELETE FROM stock_adjustments;
DELETE FROM payment_records;
DELETE FROM product_archives;
DELETE FROM purchase_return_items;
DELETE FROM purchase_return_orders;
DELETE FROM purchase_receipt_items;
DELETE FROM purchase_receipts;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM materials;
DELETE FROM distributors;
DELETE FROM suppliers;
DELETE FROM projects;
DELETE FROM categories;
DELETE FROM tool_borrows;
DELETE FROM sessions;
DELETE FROM captcha;

-- 清理用户相关（保留管理员）
DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM users WHERE username = 'admin');
DELETE FROM users WHERE username != 'admin';

PRAGMA foreign_keys = ON;
