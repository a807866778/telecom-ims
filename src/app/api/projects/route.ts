import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有项目
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();

    const projects = result.results?.map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      clientName: p.client_name,
      contactPerson: p.contact_person || "",
      contactPhone: p.contact_phone || "",
      address: p.address || "",
      bankAccount: p.bank_account || "",
      taxNumber: p.tax_number || "",
      invoiceTitle: p.invoice_title || "",
      totalRevenue: p.total_revenue || 0,
      totalCost: p.total_cost || 0,
      totalProfit: p.total_profit || 0,
      createdAt: p.created_at,
    })) || [];

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error("Projects API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建项目
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const {
      name,
      clientName,
      contactPerson,
      contactPhone,
      address,
      bankAccount,
      taxNumber,
      invoiceTitle,
      startDate,
      endDate,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "项目名称不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    // 禁用外键约束
    await db.prepare("PRAGMA foreign_keys = OFF").run();
    try {
      await db.prepare(`
        INSERT INTO projects (id, name, status, client_name, contact_person, contact_phone, address,
          bank_account, tax_number, invoice_title, start_date, end_date, total_revenue, total_cost, total_profit, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, name, "进行中",
        clientName || null,
        contactPerson || null,
        contactPhone || null,
        address || null,
        bankAccount || null,
        taxNumber || null,
        invoiceTitle || null,
        startDate || null,
        endDate || null,
        0, 0, 0, now
      ).run();
    } finally {
      await db.prepare("PRAGMA foreign_keys = ON").run();
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
