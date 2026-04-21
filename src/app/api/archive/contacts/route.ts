import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有联系人（供应商+经销商合并）
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "supplier" | "distributor" | "all"

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const contacts = [];

    // 获取供应商
    if (!type || type === "all" || type === "supplier") {
      const suppliersResult = await db.prepare("SELECT * FROM suppliers ORDER BY name").all();
      for (const s of suppliersResult.results || []) {
        contacts.push({
          id: s.id,
          type: "供应商",
          name: s.name,
          contact: s.contact || s.contact_person || "",
          phone: s.phone || "",
          address: s.address || "",
          bankAccount: s.bank_account || "",
          bankName: s.bank_name || "",
          taxNo: s.tax_no || "",
          businessLicense: s.business_license || "",
          invoiceTitle: s.invoice_title || "",
          remark: s.remark || s.notes || "",
          createdAt: s.created_at,
        });
      }
    }

    // 获取经销商
    if (!type || type === "all" || type === "distributor") {
      const distributorsResult = await db.prepare("SELECT * FROM distributors ORDER BY name").all();
      for (const d of distributorsResult.results || []) {
        contacts.push({
          id: d.id,
          type: "客户",
          name: d.name,
          contact: d.contact_person || "",
          phone: d.phone || "",
          address: d.address || "",
          bankAccount: d.bank_account || "",
          bankName: d.bank_name || "",
          taxNo: d.tax_no || "",
          businessLicense: d.business_license || "",
          invoiceTitle: d.invoice_title || "",
          remark: d.remark || "",
          createdAt: d.created_at,
        });
      }
    }

    // 按名称排序
    contacts.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    console.error("Contacts API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
