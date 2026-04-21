import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ============ 认证相关 ============

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  realName: text("real_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("user"), // admin / user
  status: text("status").notNull().default("active"), // active / disabled
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// ============ 角色权限 ============

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  permissions: text("permissions").notNull(), // JSON array
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const userRoles = sqliteTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  roleId: text("role_id").notNull().references(() => roles.id),
});

// ============ 物料分类 ============

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentId: text("parent_id"),
  sort: integer("sort").default(0),
});

// ============ 物料台账 ============

export const materials = sqliteTable("materials", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: text("category_id").references(() => categories.id),
  unit: text("unit").notNull(), // 米、台、个、箱等
  spec: text("spec"), // 规格型号
  purchasePrice: real("purchase_price").notNull().default(0), // 采购价
  salePrice: real("sale_price").notNull().default(0), // 结算价
  stockQuantity: real("stock_quantity").notNull().default(0), // 库存数量
  minStockWarning: real("min_stock_warning").notNull().default(0), // 最小库存预警
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ============ 供应商 ============

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 项目 ============

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  clientName: text("client_name"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  status: text("status").notNull().default("进行中"), // 进行中/已完成/已归档
  startDate: integer("start_date", { mode: "timestamp" }),
  endDate: integer("end_date", { mode: "timestamp" }),
  totalRevenue: real("total_revenue").notNull().default(0), // 产值
  totalCost: real("total_cost").notNull().default(0), // 成本
  totalProfit: real("total_profit").notNull().default(0), // 利润
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 入库 ============

export const inboundRecords = sqliteTable("inbound_records", {
  id: text("id").primaryKey(),
  supplierId: text("supplier_id").references(() => suppliers.id),
  operatorId: text("operator_id").references(() => users.id),
  totalAmount: real("total_amount").notNull().default(0),
  remark: text("remark"),
  photoUrl: text("photo_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const inboundItems = sqliteTable("inbound_items", {
  id: text("id").primaryKey(),
  inboundId: text("inbound_id").notNull().references(() => inboundRecords.id),
  materialId: text("material_id").notNull().references(() => materials.id),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 出库 ============

export const outboundRecords = sqliteTable("outbound_records", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  operatorId: text("operator_id").references(() => users.id),
  totalAmount: real("total_amount").notNull().default(0),
  remark: text("remark"),
  photoUrl: text("photo_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const outboundItems = sqliteTable("outbound_items", {
  id: text("id").primaryKey(),
  outboundId: text("outbound_id").notNull().references(() => outboundRecords.id),
  materialId: text("material_id").notNull().references(() => materials.id),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 退库（出库退货） ============

export const returnRecords = sqliteTable("return_records", {
  id: text("id").primaryKey(),
  outboundId: text("outbound_id").notNull().references(() => outboundRecords.id),
  projectId: text("project_id").references(() => projects.id),
  operatorId: text("operator_id").references(() => users.id),
  totalAmount: real("total_amount").notNull().default(0),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const returnItems = sqliteTable("return_items", {
  id: text("id").primaryKey(),
  returnId: text("return_id").notNull().references(() => returnRecords.id),
  materialId: text("material_id").notNull().references(() => materials.id),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 工具借用 ============

export const toolBorrows = sqliteTable("tool_borrows", {
  id: text("id").primaryKey(),
  toolId: text("tool_id").notNull().references(() => materials.id),
  borrowerId: text("borrower_id").notNull().references(() => users.id),
  projectId: text("project_id").references(() => projects.id),
  borrowDate: integer("borrow_date", { mode: "timestamp" }).notNull(),
  returnDate: integer("return_date", { mode: "timestamp" }),
  status: text("status").notNull().default("借用中"), // 借用中/已归还
});

// ============ 采购模块 ============

export const purchaseOrders = sqliteTable("purchase_orders", {
  id: text("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(), // 采购单号
  supplierId: text("supplier_id").references(() => suppliers.id),
  operatorId: text("operator_id").references(() => users.id),
  totalAmount: real("total_amount").notNull().default(0),
  status: text("status").notNull().default("待收货"), // 待收货/部分收货/已完成/已取消
  expectedDate: integer("expected_date", { mode: "timestamp" }),
  remark: text("remark"),
  photoUrl: text("photo_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const purchaseOrderItems = sqliteTable("purchase_order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => purchaseOrders.id),
  materialId: text("material_id").notNull().references(() => materials.id),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  receivedQuantity: real("received_quantity").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const purchaseReceipts = sqliteTable("purchase_receipts", {
  id: text("id").primaryKey(),
  receiptNo: text("receipt_no").notNull().unique(),
  orderId: text("order_id").references(() => purchaseOrders.id),
  operatorId: text("operator_id").references(() => users.id),
  totalAmount: real("total_amount").notNull().default(0),
  remark: text("remark"),
  photoUrl: text("photo_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const purchaseReceiptItems = sqliteTable("purchase_receipt_items", {
  id: text("id").primaryKey(),
  receiptId: text("receipt_id").notNull().references(() => purchaseReceipts.id),
  materialId: text("material_id").notNull().references(() => materials.id),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const purchaseReturnOrders = sqliteTable("purchase_return_orders", {
  id: text("id").primaryKey(),
  returnNo: text("return_no").notNull().unique(),
  orderId: text("order_id").references(() => purchaseOrders.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  operatorId: text("operator_id").references(() => users.id),
  auditorId: text("auditor_id").references(() => users.id),
  totalAmount: real("total_amount").notNull().default(0),
  status: text("status").notNull().default("待审核"),
  reason: text("reason"),
  photoUrl: text("photo_url"),
  auditRemark: text("audit_remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  auditedAt: integer("audited_at", { mode: "timestamp" }),
});

export const purchaseReturnItems = sqliteTable("purchase_return_items", {
  id: text("id").primaryKey(),
  returnId: text("return_id").notNull().references(() => purchaseReturnOrders.id),
  materialId: text("material_id").notNull().references(() => materials.id),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 安规培训 ============

export const trainingModules = sqliteTable("training_modules", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  videoUrl: text("video_url"),
  externalLink: text("external_link"),
  passingScore: integer("passing_score").notNull().default(80),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const trainingRecords = sqliteTable("training_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  moduleId: text("module_id").notNull().references(() => trainingModules.id),
  score: integer("score").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }).notNull(),
});

export const trainingExams = sqliteTable("training_exams", {
  id: text("id").primaryKey(),
  moduleId: text("module_id").notNull().references(() => trainingModules.id),
  questionType: text("question_type").notNull(), // single / multi
  question: text("question").notNull(),
  options: text("options").notNull(), // JSON array
  answer: text("answer").notNull(),
  score: integer("score").notNull().default(10),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const trainingVideos = sqliteTable("training_videos", {
  id: text("id").primaryKey(),
  moduleId: text("module_id").references(() => trainingModules.id),
  title: text("title").notNull(),
  videoUrl: text("video_url"),
  externalUrl: text("external_url"),
  duration: integer("duration"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 档案管理 ============

export const distributors = sqliteTable("distributors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  businessLicense: text("business_license"),
  contractUrls: text("contract_urls"),
  bankAccount: text("bank_account"),
  bankName: text("bank_name"),
  taxNo: text("tax_no"),
  invoiceTitle: text("invoice_title"),
  paymentRecords: text("payment_records"),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const productArchives = sqliteTable("product_archives", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  distributorId: text("distributor_id").references(() => distributors.id),
  categoryId: text("category_id").references(() => categories.id),
  spec: text("spec"),
  model: text("model"),
  unit: text("unit").notNull(),
  purchasePrice: real("purchase_price").notNull().default(0),
  salePrice: real("sale_price").notNull().default(0),
  specialRemark: text("special_remark"),
  manualUrl: text("manual_url"),
  certificateUrl: text("certificate_url"),
  packagingUrl: text("packaging_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const projectContracts = sqliteTable("project_contracts", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  contractNo: text("contract_no"),
  contractName: text("contract_name").notNull(),
  contractAmount: real("contract_amount"),
  contractUrls: text("contract_urls"),
  signedDate: integer("signed_date", { mode: "timestamp" }),
  expireDate: integer("expire_date", { mode: "timestamp" }),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ============ 人员管理 ============

export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  idCard: text("id_card"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  position: text("position"),
  status: text("status").notNull().default("在职"),
  joinDate: integer("join_date", { mode: "timestamp" }),
  leaveDate: integer("leave_date", { mode: "timestamp" }),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const staffHealth = sqliteTable("staff_health", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  healthCertificateNo: text("health_certificate_no"),
  healthCertificateUrl: text("health_certificate_url"),
  checkupDate: integer("checkup_date", { mode: "timestamp" }),
  checkupResult: text("checkup_result"),
  checkupReportUrl: text("checkup_report_url"),
  expireDate: integer("expire_date", { mode: "timestamp" }),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const staffLicenses = sqliteTable("staff_licenses", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  licenseType: text("license_type").notNull(),
  licenseNo: text("license_no"),
  licenseUrl: text("license_url"),
  issueDate: integer("issue_date", { mode: "timestamp" }),
  expireDate: integer("expire_date", { mode: "timestamp" }),
  status: text("status").notNull().default("有效"),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 售后管理 ============

export const complaints = sqliteTable("complaints", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  content: text("content").notNull(),
  status: text("status").notNull().default("待处理"),
  handlerId: text("handler_id").references(() => users.id),
  solution: text("solution"),
  resolveDate: integer("resolve_date", { mode: "timestamp" }),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const afterSales = sqliteTable("after_sales", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => materials.id),
  projectId: text("project_id").references(() => projects.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  distributorId: text("distributor_id").references(() => distributors.id),
  status: text("status").notNull().default("待处理"),
  result: text("result"),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ============ 仓储扩展 ============

export const stockFlow = sqliteTable("stock_flow", {
  id: text("id").primaryKey(),
  materialId: text("material_id").notNull().references(() => materials.id),
  type: text("type").notNull(), // 入库/出库/调整
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  relatedId: text("related_id"),
  relatedType: text("related_type"), // inbound/outbound/return/adjustment
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const stockAdjustments = sqliteTable("stock_adjustments", {
  id: text("id").primaryKey(),
  materialId: text("material_id").notNull().references(() => materials.id),
  adjustmentType: text("adjustment_type").notNull(), // 报溢/报损
  quantity: real("quantity").notNull(),
  reason: text("reason"),
  operatorId: text("operator_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const stockChecks = sqliteTable("stock_checks", {
  id: text("id").primaryKey(),
  checkDate: integer("check_date", { mode: "timestamp" }).notNull(),
  operatorId: text("operator_id").references(() => users.id),
  status: text("status").notNull().default("盘点中"),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const stockCheckItems = sqliteTable("stock_check_items", {
  id: text("id").primaryKey(),
  checkId: text("check_id").notNull().references(() => stockChecks.id),
  materialId: text("material_id").notNull().references(() => materials.id),
  systemQuantity: real("system_quantity").notNull(),
  actualQuantity: real("actual_quantity").notNull(),
  diffQuantity: real("diff_quantity").notNull(),
  remark: text("remark"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 通知 ============

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("system"),
  targetUsers: text("target_users"),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const userNotifications = sqliteTable("user_notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  notificationId: text("notification_id").notNull().references(() => notifications.id),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============ 类型导出 ============

export type User = typeof users.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InboundRecord = typeof inboundRecords.$inferSelect;
export type InboundItem = typeof inboundItems.$inferSelect;
export type OutboundRecord = typeof outboundRecords.$inferSelect;
export type OutboundItem = typeof outboundItems.$inferSelect;
export type ReturnRecord = typeof returnRecords.$inferSelect;
export type ReturnItem = typeof returnItems.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type TrainingRecord = typeof trainingRecords.$inferSelect;
export type TrainingExam = typeof trainingExams.$inferSelect;
export type TrainingVideo = typeof trainingVideos.$inferSelect;
export type Distributor = typeof distributors.$inferSelect;
export type ProductArchive = typeof productArchives.$inferSelect;
export type ProjectContract = typeof projectContracts.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type StaffHealth = typeof staffHealth.$inferSelect;
export type StaffLicense = typeof staffLicenses.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
export type AfterSale = typeof afterSales.$inferSelect;
export type StockFlow = typeof stockFlow.$inferSelect;
export type StockAdjustment = typeof stockAdjustments.$inferSelect;
export type StockCheck = typeof stockChecks.$inferSelect;
export type StockCheckItem = typeof stockCheckItems.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserNotification = typeof userNotifications.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type PurchaseReceipt = typeof purchaseReceipts.$inferSelect;
export type PurchaseReceiptItem = typeof purchaseReceiptItems.$inferSelect;
export type PurchaseReturnOrder = typeof purchaseReturnOrders.$inferSelect;
export type PurchaseReturnItem = typeof purchaseReturnItems.$inferSelect;
