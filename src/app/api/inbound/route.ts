import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有入库记录，或获取供应商/物料列表
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "suppliers") {
      const result = await db.prepare("SELECT id, name FROM suppliers ORDER BY name").all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    if (type === "materials") {
      const result = await db.prepare("SELECT id, name, spec, unit, stock_quantity FROM materials ORDER BY name").all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    const recordsResult = await db.prepare("SELECT * FROM inbound_records ORDER BY created_at DESC LIMIT 50").all();
    const suppliersResult = await db.prepare("SELECT * FROM suppliers").all();
    const usersResult = await db.prepare("SELECT * FROM users").all();
    const itemsResult = await db.prepare("SELECT * FROM inbound_items").all();

    const suppliersMap = new Map();
    suppliersResult.results?.forEach((s: any) => suppliersMap.set(s.id, s));

    const usersMap = new Map();
    usersResult.results?.forEach((u: any) => usersMap.set(u.id, u));

    const records = recordsResult.results?.map((r: any) => {
      const supplier = suppliersMap.get(r.supplier_id);
      const operator = usersMap.get(r.operator_id);
      const items = itemsResult.results?.filter((i: any) => i.inbound_id === r.id) || [];

      return {
        id: r.id,
        supplierId: r.supplier_id,
        supplierName: supplier?.name || "未知供应商",
        operatorId: r.operator_id,
        operatorName: operator?.real_name || "未知",
        totalAmount: r.total_amount || 0,
        itemCount: items.length,
        notes: r.remark,
        createdAt: r.created_at,
      };
    }) || [];

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Inbound API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建入库单
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { supplierId, items, notes } = body;

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

    const recordId = crypto.randomUUID();
    const now = Date.now();

    // 计算总金额
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (item.unitPrice || 0) * (item.quantity || 0);
    }

      // 创建入库记录
    await db.prepare(`
      INSERT INTO inbound_records (id, supplier_id, operator_id, total_amount, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(recordId, supplierId || null, operatorId, totalAmount, notes || null, now).run();

    // 创建入库明细并更新库存
    for (const item of items) {
      const itemId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO inbound_items (id, inbound_id, material_id, quantity, unit_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(itemId, recordId, item.materialId, item.quantity, item.unitPrice || 0, now).run();

      // 更新物料库存
      await db.prepare(`
        UPDATE materials SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?
      `).bind(item.quantity, now, item.materialId).run();
    }

    return NextResponse.json({ success: true, data: { id: recordId } });
  } catch (error) {
    console.error("Create inbound error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
