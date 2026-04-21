import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取退货详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    // 获取退货信息
    const returnResult = await db.prepare(`
      SELECT pro.*, s.name as supplier_name, u1.real_name as operator_name, u2.real_name as auditor_name, po.order_no
      FROM purchase_return_orders pro
      LEFT JOIN suppliers s ON pro.supplier_id = s.id
      LEFT JOIN users u1 ON pro.operator_id = u1.id
      LEFT JOIN users u2 ON pro.auditor_id = u2.id
      LEFT JOIN purchase_orders po ON pro.order_id = po.id
      WHERE pro.id = ?
    `).bind(id).first();

    if (!returnResult) {
      return NextResponse.json({ success: false, error: "退货记录不存在" }, { status: 404 });
    }

    // 获取退货明细
    const itemsResult = await db.prepare(`
      SELECT pri.*, m.name as material_name, m.spec as material_spec, m.unit
      FROM purchase_return_items pri
      LEFT JOIN materials m ON pri.material_id = m.id
      WHERE pri.return_id = ?
    `).bind(id).all();

    const returnOrder = {
      id: returnResult.id,
      returnNo: returnResult.return_no,
      orderId: returnResult.order_id,
      orderNo: returnResult.order_no || "-",
      supplierId: returnResult.supplier_id,
      supplierName: returnResult.supplier_name || "未知供应商",
      operatorId: returnResult.operator_id,
      operatorName: returnResult.operator_name || "未知",
      auditorId: returnResult.auditor_id,
      auditorName: returnResult.auditor_name || "-",
      totalAmount: returnResult.total_amount || 0,
      status: returnResult.status,
      reason: returnResult.reason,
      photoUrl: returnResult.photo_url,
      auditRemark: returnResult.audit_remark,
      createdAt: returnResult.created_at,
      auditedAt: returnResult.audited_at,
      items: (itemsResult.results || []).map((i: any) => ({
        id: i.id,
        materialId: i.material_id,
        materialName: i.material_name,
        materialSpec: i.material_spec,
        unit: i.unit,
        quantity: i.quantity,
        unitPrice: i.unit_price,
      })),
    };

    return NextResponse.json({ success: true, data: returnOrder });
  } catch (error) {
    console.error("Get purchase return error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 审核退货申请
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { status, auditorId, auditRemark } = body;

    const now = Date.now();

    // 更新退货状态
    if (status === "已退货") {
      // 如果是退货完成，需要扣减库存
      const itemsResult = await db.prepare(`
        SELECT pri.*, pro.order_id FROM purchase_return_items pri
        LEFT JOIN purchase_return_orders pro ON pri.return_id = pro.id
        WHERE pri.return_id = ?
      `).bind(id).all();

      // 扣减库存
      for (const item of itemsResult.results || []) {
        await db.prepare(`
          UPDATE materials SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?
        `).bind(item.quantity, now, item.material_id).run();
      }
    }

    await db.prepare(`
      UPDATE purchase_return_orders SET
        status = ?,
        auditor_id = ?,
        audit_remark = ?,
        audited_at = ?
      WHERE id = ?
    `).bind(status, auditorId || null, auditRemark || null, now, id).run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Update purchase return error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除退货申请
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    // 删除退货明细
    await db.prepare("DELETE FROM purchase_return_items WHERE return_id = ?").bind(id).run();

    // 删除退货申请
    await db.prepare("DELETE FROM purchase_return_orders WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete purchase return error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
