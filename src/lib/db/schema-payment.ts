import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const paymentRecords = sqliteTable("payment_records", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // income(收入) | expense(支出)
  counterpartyType: text("counterparty_type").notNull(), // supplier(供应商) | distributor(客户)
  counterpartyId: text("counterparty_id").notNull(), // supplier.id or distributor.id
  counterpartyName: text("counterparty_name").notNull(), // 冗余存储便于显示
  amount: real("amount").notNull(), // 金额
  paymentDate: integer("payment_date", { mode: "timestamp" }).notNull(), // 日期时间戳
  relatedProjectId: text("related_project_id"), // 关联项目（可选）
  relatedProjectName: text("related_project_name"), // 项目名称（冗余）
  remark: text("remark"), // 备注
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type PaymentRecord = typeof paymentRecords.$inferSelect;
