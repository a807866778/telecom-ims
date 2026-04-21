import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取采购订单详情
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

    // 获取订单信息
    const orderResult = await db.prepare(`
      SELECT po.*, s.name as supplier_name, u.real_name as operator_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.operator_id = u.id
      WHERE po.id = ?
    `).bind(id).first();

    if (!orderResult) {
      return NextResponse.json({ success: false, error: "订单不存在" }, { status: 404 });
    }

    // 获取订单明细
    const itemsResult = await db.prepare(`
      SELECT poi.*, m.name as material_name, m.spec as material_spec, m.unit
      FROM purchase_order_items poi
      LEFT JOIN materials m ON poi.material_id = m.id
      WHERE poi.order_id = ?
    `).bind(id).all();

    const order = {
      id: orderResult.id,
      orderNo: orderResult.order_no,
      supplierId: orderResult.supplier_id,
      supplierName: orderResult.supplier_name || "未知供应商",
      operatorId: orderResult.operator_id,
      operatorName: orderResult.operator_name || "未知",
      totalAmount: orderResult.total_amount || 0,
      status: orderResult.status,
      expectedDate: orderResult.expected_date,
      remark: orderResult.remark,
      photoUrl: orderResult.photo_url,
      createdAt: orderResult.created_at,
      updatedAt: orderResult.updated_at,
      items: (itemsResult.results || []).map((i: any) => ({
        id: i.id,
        materialId: i.material_id,
        materialName: i.material_name,
        materialSpec: i.material_spec,
        unit: i.unit,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        receivedQuantity: i.received_quantity,
      })),
    };

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Get purchase order error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新采购订单
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
    const { supplierId, items, expectedDate, remark, photoUrl, status } = body;

    const now = Date.now();

    // 如果有物料明细，更新订单
    if (items && items.length > 0) {
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += (item.unitPrice || 0) * (item.quantity || 0);
      }

      // 更新订单
      await db.prepare(`
        UPDATE purchase_orders SET
          supplier_id = ?,
          total_amount = ?,
          expected_date = ?,
          remark = ?,
          photo_url = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(supplierId || null, totalAmount, expectedDate || null, remark || null, photoUrl || null, status || "待收货", now, id).run();

      // 删除旧明细
      await db.prepare("DELETE FROM purchase_order_items WHERE order_id = ?").bind(id).run();

      // 创建新明细
      for (const item of items) {
        const itemId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO purchase_order_items (id, order_id, material_id, quantity, unit_price, received_quantity, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(itemId, id, item.materialId, item.quantity, item.unitPrice || 0, item.receivedQuantity || 0, now).run();
      }
    } else {
      // 只更新基本信息
      await db.prepare(`
        UPDATE purchase_orders SET
          supplier_id = ?,
          expected_date = ?,
          remark = ?,
          photo_url = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(supplierId || null, expectedDate || null, remark || null, photoUrl || null, status || "待收货", now, id).run();
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Update purchase order error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除采购订单
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

    // 删除订单明细
    await db.prepare("DELETE FROM purchase_order_items WHERE order_id = ?").bind(id).run();

    // 删除订单
    await db.prepare("DELETE FROM purchase_orders WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete purchase order error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
