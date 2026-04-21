import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有供应商
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db.prepare("SELECT * FROM suppliers ORDER BY name").all();

    const suppliers = result.results?.map((s: any) => ({
      id: s.id,
      name: s.name,
      contactPerson: s.contact || s.contact_person || null,
      phone: s.phone,
      address: s.address,
      businessLicense: s.business_license || null,
      contractUrls: s.contract_urls || null,
      bankAccount: s.bank_account || null,
      bankName: s.bank_name || null,
      taxNo: s.tax_no || null,
      invoiceTitle: s.invoice_title || null,
      paymentRecords: s.payment_records_text || null,
      remark: s.remark || s.notes || null,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })) || [];

    return NextResponse.json({ success: true, data: suppliers });
  } catch (error) {
    console.error("Suppliers API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建供应商
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { name, contactPerson, phone, address, businessLicense, contractUrls, bankAccount, bankName, taxNo, invoiceTitle, paymentRecords, remark } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "供应商名称不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await db.prepare(`
      INSERT INTO suppliers (id, name, contact, phone, address, business_license, contract_urls, bank_account, bank_name, tax_no, invoice_title, payment_records_text, remark, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, name, contactPerson || null, phone || null, address || null,
      businessLicense || null, contractUrls ? JSON.stringify(contractUrls) : null,
      bankAccount || null, bankName || null, taxNo || null,
      invoiceTitle || null, paymentRecords ? JSON.stringify(paymentRecords) : null,
      remark || null, now, now
    ).run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新供应商（前端传 id 在 body 里）
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, name, contactPerson, phone, address, businessLicense, contractUrls, bankAccount, bankName, taxNo, invoiceTitle, paymentRecords, remark } = body;

    if (!id || !name) {
      return NextResponse.json({ success: false, error: "缺少ID或名称" }, { status: 400 });
    }

    const now = Date.now();
    await db.prepare(`
      UPDATE suppliers SET
        name = ?, contact = ?, phone = ?, address = ?,
        business_license = ?, contract_urls = ?,
        bank_account = ?, bank_name = ?, tax_no = ?,
        invoice_title = ?, payment_records_text = ?, remark = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      name, contactPerson || null, phone || null, address || null,
      businessLicense || null, contractUrls ? JSON.stringify(contractUrls) : null,
      bankAccount || null, bankName || null, taxNo || null,
      invoiceTitle || null, paymentRecords ? JSON.stringify(paymentRecords) : null,
      remark || null, now, id
    ).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update supplier error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除供应商
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "缺少供应商ID" }, { status: 400 });
    }

    await db.prepare("DELETE FROM suppliers WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete supplier error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

