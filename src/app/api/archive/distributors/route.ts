import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有经销商
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db.prepare("SELECT * FROM distributors ORDER BY updated_at DESC").all();

    const data =
      result.results?.map((d: any) => ({
        id: d.id,
        name: d.name,
        contactPerson: d.contact_person,
        phone: d.phone,
        address: d.address,
        businessLicense: d.business_license,
        contractUrls: d.contract_urls,
        bankAccount: d.bank_account,
        bankName: d.bank_name,
        taxNo: d.tax_no,
        invoiceTitle: d.invoice_title,
        paymentRecords: d.payment_records,
        remark: d.remark,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })) || [];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Distributors GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建经销商
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
        `INSERT INTO distributors (id, name, contact_person, phone, address, business_license, contract_urls, bank_account, bank_name, tax_no, invoice_title, payment_records, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, name, contactPerson || null, phone || null, address || null, businessLicense || null, contractUrls ? JSON.stringify(contractUrls) : null, bankAccount || null, bankName || null, taxNo || null, invoiceTitle || null, paymentRecords ? JSON.stringify(paymentRecords) : null, remark || null, now, now)
      .run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Distributors POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新经销商
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
        `UPDATE distributors SET name = ?, contact_person = ?, phone = ?, address = ?, business_license = ?, contract_urls = ?, bank_account = ?, bank_name = ?, tax_no = ?, invoice_title = ?, payment_records = ?, remark = ?, updated_at = ? WHERE id = ?`
      )
      .bind(name, contactPerson || null, phone || null, address || null, businessLicense || null, contractUrls ? JSON.stringify(contractUrls) : null, bankAccount || null, bankName || null, taxNo || null, invoiceTitle || null, paymentRecords ? JSON.stringify(paymentRecords) : null, remark || null, now, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Distributors PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除经销商
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

    await db.prepare("DELETE FROM distributors WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Distributors DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
