import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取采购收货单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const { id } = await params;

    // 获取收货单主记录
    const receiptResult = await db.prepare(`
      SELECT pr.*, u.real_name as operator_name,
             po.order_no, po.supplier_id,
             s.name as supplier_name
      FROM purchase_receipts pr
      LEFT JOIN users u ON pr.operator_id = u.id
      LEFT JOIN purchase_orders po ON pr.order_id = po.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE pr.id = ?
    `).bind(id).all();

    if (!receiptResult.results || receiptResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "收货单不存在" }, { status: 404 });
    }

    const r = receiptResult.results[0] as any;

    // 获取收货明细
    const itemsResult = await db.prepare(`
      SELECT pri.*, m.name as material_name, m.spec as material_spec, m.unit
      FROM purchase_receipt_items pri
      LEFT JOIN materials m ON pri.material_id = m.id
      WHERE pri.receipt_id = ?
    `).bind(id).all();

    return NextResponse.json({
      success: true,
      data: {
        id: r.id,
        receiptNo: r.receipt_no,
        orderId: r.order_id,
        orderNo: r.order_no || "无",
        supplierId: r.supplier_id,
        supplierName: r.supplier_name || "未知供应商",
        operatorId: r.operator_id,
        operatorName: r.operator_name || "未知",
        totalAmount: r.total_amount || 0,
        remark: r.remark,
        photoUrl: r.photo_url,
        createdAt: r.created_at,
        items: (itemsResult.results || []).map((item: any) => ({
          id: item.id,
          materialId: item.material_id,
          materialName: item.material_name || "未知物料",
          materialSpec: item.material_spec,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unit_price || 0,
        })),
      },
    });
  } catch (error) {
    console.error("Purchase receipt detail API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
