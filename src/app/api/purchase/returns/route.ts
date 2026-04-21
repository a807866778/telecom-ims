import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 生成退货单号
function generateReturnNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `RET${year}${month}${day}${random}`;
}

// GET - 获取采购退货列表
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    // 获取采购订单列表（用于关联）
    if (type === "orders") {
      const result = await db.prepare(`
        SELECT po.id, po.order_no, po.total_amount, po.status, s.name as supplier_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.status IN ('待收货', '部分收货')
        ORDER BY po.created_at DESC
        LIMIT 100
      `).all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    // 获取供应商列表
    if (type === "suppliers") {
      const result = await db.prepare("SELECT id, name FROM suppliers ORDER BY name").all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    // 获取物料列表
    if (type === "materials") {
      const result = await db.prepare("SELECT id, name, spec, unit, stock_quantity, purchase_price FROM materials ORDER BY name").all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    // 获取退货列表
    const returnsResult = await db.prepare(`
      SELECT pro.*, s.name as supplier_name, u1.real_name as operator_name, u2.real_name as auditor_name, po.order_no
      FROM purchase_return_orders pro
      LEFT JOIN suppliers s ON pro.supplier_id = s.id
      LEFT JOIN users u1 ON pro.operator_id = u1.id
      LEFT JOIN users u2 ON pro.auditor_id = u2.id
      LEFT JOIN purchase_orders po ON pro.order_id = po.id
      ORDER BY pro.created_at DESC
      LIMIT 100
    `).all();

    // 获取退货明细
    const itemsResult = await db.prepare(`
      SELECT pri.*, m.name as material_name, m.spec as material_spec, m.unit
      FROM purchase_return_items pri
      LEFT JOIN materials m ON pri.material_id = m.id
    `).all();

    const returns = (returnsResult.results || []).map((r: any) => {
      const items = (itemsResult.results || []).filter((i: any) => i.return_id === r.id);
      return {
        id: r.id,
        returnNo: r.return_no,
        orderId: r.order_id,
        orderNo: r.order_no || "-",
        supplierId: r.supplier_id,
        supplierName: r.supplier_name || "未知供应商",
        operatorId: r.operator_id,
        operatorName: r.operator_name || "未知",
        auditorId: r.auditor_id,
        auditorName: r.auditor_name || "-",
        totalAmount: r.total_amount || 0,
        status: r.status,
        reason: r.reason,
        photoUrl: r.photo_url,
        auditRemark: r.audit_remark,
        itemCount: items.length,
        items: items.map((i: any) => ({
          id: i.id,
          materialId: i.material_id,
          materialName: i.material_name,
          materialSpec: i.material_spec,
          unit: i.unit,
          quantity: i.quantity,
          unitPrice: i.unit_price,
        })),
        createdAt: r.created_at,
        auditedAt: r.audited_at,
      };
    });

    return NextResponse.json({ success: true, data: returns });
  } catch (error) {
    console.error("Purchase returns API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建采购退货申请
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { orderId, supplierId, items, reason, photoUrl } = body;

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

    const returnId = crypto.randomUUID();
    const now = Date.now();
    const returnNo = generateReturnNo();

    // 计算总金额
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.unitPrice || 0) * (item.quantity || 0);
    }

    // 创建退货申请
    await db.prepare(`
      INSERT INTO purchase_return_orders (id, return_no, order_id, supplier_id, operator_id, total_amount, status, reason, photo_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(returnId, returnNo, orderId || null, supplierId || null, operatorId, totalAmount, "待审核", reason || null, photoUrl || null, now).run();

    // 创建退货明细
    for (const item of items) {
      const itemId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO purchase_return_items (id, return_id, material_id, quantity, unit_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(itemId, returnId, item.materialId, item.quantity, item.unitPrice || 0, now).run();
    }

    return NextResponse.json({ success: true, data: { id: returnId, returnNo } });
  } catch (error) {
    console.error("Create purchase return error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
