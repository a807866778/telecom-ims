import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 生成收货单号
function generateReceiptNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `PR${year}${month}${day}${random}`;
}

// GET - 获取采购收货记录列表
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    // 获取收货记录
    const receiptsResult = await db.prepare(`
      SELECT pr.*, u.real_name as operator_name, po.order_no
      FROM purchase_receipts pr
      LEFT JOIN users u ON pr.operator_id = u.id
      LEFT JOIN purchase_orders po ON pr.order_id = po.id
      ORDER BY pr.created_at DESC
      LIMIT 100
    `).all();

    // 获取收货明细
    const itemsResult = await db.prepare(`
      SELECT pri.*, m.name as material_name, m.spec as material_spec, m.unit
      FROM purchase_receipt_items pri
      LEFT JOIN materials m ON pri.material_id = m.id
    `).all();

    const receipts = (receiptsResult.results || []).map((r: any) => {
      const items = (itemsResult.results || []).filter((i: any) => i.receipt_id === r.id);
      return {
        id: r.id,
        receiptNo: r.receipt_no,
        orderId: r.order_id,
        orderNo: r.order_no || "-",
        operatorId: r.operator_id,
        operatorName: r.operator_name || "未知",
        totalAmount: r.total_amount || 0,
        remark: r.remark,
        photoUrl: r.photo_url,
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
      };
    });

    return NextResponse.json({ success: true, data: receipts });
  } catch (error) {
    console.error("Purchase receipts API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建采购收货记录
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { orderId, items, remark, photoUrl } = body;

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

    const receiptId = crypto.randomUUID();
    const now = Date.now();
    const receiptNo = generateReceiptNo();

    // 计算总金额
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.unitPrice || 0) * (item.quantity || 0);
    }

    // 创建收货记录
    await db.prepare(`
      INSERT INTO purchase_receipts (id, receipt_no, order_id, operator_id, total_amount, remark, photo_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(receiptId, receiptNo, orderId || null, operatorId, totalAmount, remark || null, photoUrl || null, now).run();

    // 创建收货明细并更新库存
    for (const item of items) {
      const itemId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO purchase_receipt_items (id, receipt_id, material_id, quantity, unit_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(itemId, receiptId, item.materialId, item.quantity, item.unitPrice || 0, now).run();

      // 更新物料库存
      await db.prepare(`
        UPDATE materials SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?
      `).bind(item.quantity, now, item.materialId).run();

      // 更新采购订单的已收货数量
      if (orderId) {
        await db.prepare(`
          UPDATE purchase_order_items SET received_quantity = received_quantity + ? WHERE order_id = ? AND material_id = ?
        `).bind(item.quantity, orderId, item.materialId).run();
      }
    }

    // 检查并更新采购订单状态
    if (orderId) {
      const orderItemsResult = await db.prepare(`
        SELECT SUM(quantity) as total, SUM(received_quantity) as received FROM purchase_order_items WHERE order_id = ?
      `).bind(orderId).first();

      if (orderItemsResult) {
        const total = orderItemsResult.total || 0;
        const received = orderItemsResult.received || 0;

        let newStatus = "待收货";
        if (received >= total && total > 0) {
          newStatus = "已完成";
        } else if (received > 0) {
          newStatus = "部分收货";
        }

        await db.prepare(`
          UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?
        `).bind(newStatus, now, orderId).run();
      }
    }

    return NextResponse.json({ success: true, data: { id: receiptId, receiptNo } });
  } catch (error) {
    console.error("Create purchase receipt error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
