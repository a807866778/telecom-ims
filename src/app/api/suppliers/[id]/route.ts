import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取供应商详情
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "缺少供应商ID" }, { status: 400 });
    }

    const supplierResult = await db.prepare("SELECT * FROM suppliers WHERE id = ?").bind(id).all();

    if (!supplierResult.results || supplierResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "供应商不存在" }, { status: 404 });
    }

    const s = supplierResult.results[0] as any;

    // 获取该供应商的入库记录
    const inboundResult = await db.prepare(`
      SELECT ir.*, u.real_name as operator_name
      FROM inbound_records ir
      LEFT JOIN users u ON ir.operator_id = u.id
      WHERE ir.supplier_id = ?
      ORDER BY ir.created_at DESC
      LIMIT 20
    `).bind(id).all();

    // 统计
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
      FROM inbound_records
      WHERE supplier_id = ?
    `).bind(id).all();

    return NextResponse.json({
      success: true,
      data: {
        supplier: {
          id: s.id,
          name: s.name,
          contactPerson: s.contact || s.contact_person || null,
          phone: s.phone || null,
          address: s.address || null,
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
        },
        inboundRecords: (inboundResult.results || []).map((r: any) => ({
          id: r.id,
          totalAmount: r.total_amount || 0,
          operatorName: r.operator_name || "未知",
          notes: r.notes,
          createdAt: r.created_at,
        })),
        stats: {
          orderCount: statsResult.results?.[0]?.count || 0,
          totalAmount: statsResult.results?.[0]?.total || 0,
        }
      }
    });
  } catch (error) {
    console.error("Supplier detail API error:", error);
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

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "缺少供应商ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, contactPerson, phone, address, businessLicense, contractUrls, bankAccount, bankName, taxNo, invoiceTitle, paymentRecords, remark } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "供应商名称不能为空" }, { status: 400 });
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
