import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withPermission } from "@/lib/auth/permission-check";

// 生成采购单号
function generateOrderNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `PO${year}${month}${day}${random}`;
}

// GET - 获取采购订单列表，或获取供应商/物料列表
export async function GET(request: NextRequest) {
  const { authorized } = await withPermission(request, "purchase:view");
  
  if (!authorized) {
    return NextResponse.json({ success: false, error: "没有权限查看采购订单" }, { status: 403 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    // 获取供应商列表 - 需要 supplier:view
    if (type === "suppliers") {
      const { authorized: auth } = await withPermission(request, "supplier:view");
      if (!auth) {
        return NextResponse.json({ success: false, error: "没有权限查看供应商" }, { status: 403 });
      }
      const result = await db.prepare("SELECT id, name FROM suppliers ORDER BY name").all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    // 获取物料列表
    if (type === "materials") {
      const { authorized: auth } = await withPermission(request, "material:view");
      if (!auth) {
        return NextResponse.json({ success: false, error: "没有权限查看物料" }, { status: 403 });
      }
      const result = await db.prepare(`
        SELECT m.id, m.name, m.spec, m.unit, 
               COALESCE(m.stock_quantity, 0) as stock_quantity, 
               COALESCE(m.purchase_price, 0) as purchase_price 
        FROM materials m 
        ORDER BY m.name
      `).all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    // 获取采购订单列表
    const ordersResult = await db.prepare(`
      SELECT po.*, s.name as supplier_name, u.real_name as operator_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.operator_id = u.id
      ORDER BY po.created_at DESC
      LIMIT 100
    `).all();

    // 获取订单明细
    const itemsResult = await db.prepare(`
      SELECT poi.*, m.name as material_name, m.spec as material_spec, m.unit
      FROM purchase_order_items poi
      LEFT JOIN materials m ON poi.material_id = m.id
    `).all();

    const orders = (ordersResult.results || []).map((order: any) => {
      const items = (itemsResult.results || []).filter((i: any) => i.order_id === order.id);
      return {
        id: order.id,
        orderNo: order.order_no,
        supplierId: order.supplier_id,
        supplierName: order.supplier_name || "未知供应商",
        operatorId: order.operator_id,
        operatorName: order.operator_name || "未知",
        totalAmount: order.total_amount || 0,
        status: order.status,
        expectedDate: order.expected_date,
        remark: order.remark,
        photoUrl: order.photo_url,
        itemCount: items.length,
        items: items.map((i: any) => ({
          id: i.id,
          materialId: i.material_id,
          materialName: i.material_name,
          materialSpec: i.material_spec,
          unit: i.unit,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          receivedQuantity: i.received_quantity,
        })),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      };
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Purchase orders API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建采购订单
export async function POST(request: NextRequest) {
  const { authorized } = await withPermission(request, "purchase:create");
  
  if (!authorized) {
    return NextResponse.json({ success: false, error: "没有权限创建采购订单" }, { status: 403 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { supplierId, items, expectedDate, remark, photoUrl } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "请添加至少一个物料" }, { status: 400 });
    }

    // 从 cookie 获取当前用户 ID
    const sessionId = request.cookies.get("session_id")?.value;
    let operatorId = null;
    if (sessionId) {
      const sessionResult = await db.prepare(
        "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?"
      ).bind(sessionId, Date.now()).first();
      if (sessionResult) {
        operatorId = sessionResult.user_id;
      }
    }

    const orderId = crypto.randomUUID();
    const now = Date.now();
    const orderNo = generateOrderNo();

    // 计算总金额
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.unitPrice || 0) * (item.quantity || 0);
    }

    // 禁用外键约束
    await db.prepare("PRAGMA foreign_keys = OFF").run();
    try {
      // 创建采购订单
      await db.prepare(`
        INSERT INTO purchase_orders (id, order_no, supplier_id, operator_id, total_amount, status, expected_date, remark, photo_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(orderId, orderNo, supplierId || null, operatorId, totalAmount, "待收货", expectedDate || null, remark || null, photoUrl || null, now, now).run();

      // 创建订单明细
      for (const item of items) {
        const itemId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO purchase_order_items (id, order_id, material_id, quantity, unit_price, received_quantity, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(itemId, orderId, item.materialId, item.quantity, item.unitPrice || 0, 0, now).run();
      }
    } finally {
      await db.prepare("PRAGMA foreign_keys = ON").run();
    }

    return NextResponse.json({ success: true, data: { id: orderId, orderNo } });
  } catch (error) {
    console.error("Create purchase order error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
