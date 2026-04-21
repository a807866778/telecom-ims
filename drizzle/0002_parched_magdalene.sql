CREATE TABLE `after_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text,
	`project_id` text,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`distributor_id` text,
	`status` text DEFAULT '待处理' NOT NULL,
	`result` text,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`customer_name` text,
	`customer_phone` text,
	`content` text NOT NULL,
	`status` text DEFAULT '待处理' NOT NULL,
	`handler_id` text,
	`solution` text,
	`resolve_date` integer,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`handler_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `distributors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_person` text,
	`phone` text,
	`address` text,
	`business_license` text,
	`contract_urls` text,
	`bank_account` text,
	`bank_name` text,
	`tax_no` text,
	`invoice_title` text,
	`payment_records` text,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'system' NOT NULL,
	`target_users` text,
	`is_read` integer DEFAULT false,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_archives` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`distributor_id` text,
	`category_id` text,
	`spec` text,
	`model` text,
	`unit` text NOT NULL,
	`purchase_price` real DEFAULT 0 NOT NULL,
	`sale_price` real DEFAULT 0 NOT NULL,
	`special_remark` text,
	`manual_url` text,
	`certificate_url` text,
	`packaging_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`contract_no` text,
	`contract_name` text NOT NULL,
	`contract_amount` real,
	`contract_urls` text,
	`signed_date` integer,
	`expire_date` integer,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`material_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`received_quantity` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_no` text NOT NULL,
	`supplier_id` text,
	`operator_id` text NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT '待收货' NOT NULL,
	`expected_date` integer,
	`remark` text,
	`photo_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_receipt_items` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_id` text NOT NULL,
	`material_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `purchase_receipts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_no` text NOT NULL,
	`order_id` text,
	`operator_id` text NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`remark` text,
	`photo_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_return_items` (
	`id` text PRIMARY KEY NOT NULL,
	`return_id` text NOT NULL,
	`material_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`return_id`) REFERENCES `purchase_return_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_return_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`return_no` text NOT NULL,
	`order_id` text,
	`supplier_id` text,
	`operator_id` text NOT NULL,
	`auditor_id` text,
	`total_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT '待审核' NOT NULL,
	`reason` text,
	`photo_url` text,
	`audit_remark` text,
	`created_at` integer NOT NULL,
	`audited_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`auditor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `return_items` (
	`id` text PRIMARY KEY NOT NULL,
	`return_id` text NOT NULL,
	`material_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`return_id`) REFERENCES `return_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `return_records` (
	`id` text PRIMARY KEY NOT NULL,
	`outbound_id` text NOT NULL,
	`project_id` text,
	`operator_id` text NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`remark` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`outbound_id`) REFERENCES `outbound_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`id_card` text,
	`emergency_contact` text,
	`emergency_phone` text,
	`position` text,
	`status` text DEFAULT '在职' NOT NULL,
	`join_date` integer,
	`leave_date` integer,
	`remark` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_health` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`health_certificate_no` text,
	`health_certificate_url` text,
	`checkup_date` integer,
	`checkup_result` text,
	`checkup_report_url` text,
	`expire_date` integer,
	`remark` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `staff_licenses` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`license_type` text NOT NULL,
	`license_no` text,
	`license_url` text,
	`issue_date` integer,
	`expire_date` integer,
	`status` text DEFAULT '有效' NOT NULL,
	`remark` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`material_id` text NOT NULL,
	`adjustment_type` text NOT NULL,
	`quantity` real NOT NULL,
	`reason` text,
	`operator_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_check_items` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`material_id` text NOT NULL,
	`system_quantity` real NOT NULL,
	`actual_quantity` real NOT NULL,
	`diff_quantity` real NOT NULL,
	`remark` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `stock_checks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`check_date` integer NOT NULL,
	`operator_id` text NOT NULL,
	`status` text DEFAULT '盘点中' NOT NULL,
	`remark` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_flow` (
	`id` text PRIMARY KEY NOT NULL,
	`material_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`related_id` text,
	`related_type` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `training_exams` (
	`id` text PRIMARY KEY NOT NULL,
	`module_id` text NOT NULL,
	`question_type` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`answer` text NOT NULL,
	`score` integer DEFAULT 10 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `training_modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `training_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`content` text NOT NULL,
	`video_url` text,
	`external_link` text,
	`passing_score` integer DEFAULT 80 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`module_id` text NOT NULL,
	`score` integer NOT NULL,
	`passed` integer NOT NULL,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`module_id`) REFERENCES `training_modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `training_videos` (
	`id` text PRIMARY KEY NOT NULL,
	`module_id` text,
	`title` text NOT NULL,
	`video_url` text,
	`external_url` text,
	`duration` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `training_modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`notification_id` text NOT NULL,
	`is_read` integer DEFAULT false,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `expires_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_order_no_unique` ON `purchase_orders` (`order_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_receipts_receipt_no_unique` ON `purchase_receipts` (`receipt_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_return_orders_return_no_unique` ON `purchase_return_orders` (`return_no`);