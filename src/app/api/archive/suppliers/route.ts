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

    const result = await db.prepare("SELECT * FROM suppliers ORDER BY updated_at DESC").all();

    const data =
      result.results?.map((s: any) => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contact_person,
        phone: s.phone,
        address: s.address,
        businessLicense: s.business_license,
        contractUrls: s.contract_urls,
        bankAccount: s.bank_account,
        bankName: s.bank_name,
        taxNo: s.tax_no,
        invoiceTitle: s.invoice_title,
        paymentRecords: s.payment_records,
        remark: s.remark,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })) || [];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Suppliers GET error:", error);
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
      return NextResponse.json({ success: false, error: "名称不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO suppliers (id, name, contact_person, phone, address, business_license, contract_urls, bank_account, bank_name, tax_no, invoice_title, payment_records, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, name, contactPerson || null, phone || null, address || null, businessLicense || null, contractUrls ? JSON.stringify(contractUrls) : null, bankAccount || null, bankName || null, taxNo || null, invoiceTitle || null, paymentRecords ? JSON.stringify(paymentRecords) : null, remark || null, now, now)
      .run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Suppliers POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新供应商
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, name, contactPerson, phone, address, businessLicense, contractUrls, bankAccount, bankName, taxNo, invoiceTitle, paymentRecords, remark } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    const now = Date.now();

    await db
      .prepare(
        `UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, address = ?, business_license = ?, contract_urls = ?, bank_account = ?, bank_name = ?, tax_no = ?, invoice_title = ?, payment_records = ?, remark = ?, updated_at = ? WHERE id = ?`
      )
      .bind(name, contactPerson || null, phone || null, address || null, businessLicense || null, contractUrls ? JSON.stringify(contractUrls) : null, bankAccount || null, bankName || null, taxNo || null, invoiceTitle || null, paymentRecords ? JSON.stringify(paymentRecords) : null, remark || null, now, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Suppliers PUT error:", error);
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
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    await db.prepare("DELETE FROM suppliers WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Suppliers DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
