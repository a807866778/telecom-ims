import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有退库记录
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    // 获取可选的项目列表
    if (type === "projects") {
      const result = await db.prepare("SELECT id, name FROM projects ORDER BY created_at DESC").all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    // 获取可选的原出库单列表
    if (type === "outbounds") {
      const result = await db.prepare(`
        SELECT o.id, o.created_at, p.name as project_name 
        FROM outbound_records o 
        LEFT JOIN projects p ON o.project_id = p.id 
        ORDER BY o.created_at DESC 
        LIMIT 50
      `).all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    // 获取退库物料列表
    if (type === "materials") {
      const result = await db.prepare("SELECT id, name, spec, unit, stock_quantity, purchase_price FROM materials ORDER BY name").all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    // 获取退库记录列表
    const recordsResult = await db.prepare("SELECT * FROM return_records ORDER BY created_at DESC LIMIT 50").all();
    const projectsResult = await db.prepare("SELECT * FROM projects").all();
    const usersResult = await db.prepare("SELECT * FROM users").all();
    const outboundResult = await db.prepare("SELECT * FROM outbound_records").all();
    const itemsResult = await db.prepare("SELECT * FROM return_items").all();

    const projectsMap = new Map();
    projectsResult.results?.forEach((p: any) => projectsMap.set(p.id, p));

    const usersMap = new Map();
    usersResult.results?.forEach((u: any) => usersMap.set(u.id, u));

    const outboundMap = new Map();
    outboundResult.results?.forEach((o: any) => outboundMap.set(o.id, o));

    const records = recordsResult.results?.map((r: any) => {
      const project = projectsMap.get(r.project_id);
      const operator = usersMap.get(r.operator_id);
      const outbound = outboundMap.get(r.outbound_id);
      const items = itemsResult.results?.filter((i: any) => i.return_id === r.id) || [];

      return {
        id: r.id,
        outboundId: r.outbound_id,
        projectId: r.project_id,
        projectName: project?.name || "未知项目",
        operatorId: r.operator_id,
        operatorName: operator?.real_name || "未知",
        outboundDate: outbound?.created_at,
        totalAmount: r.total_amount || 0,
        itemCount: items.length,
        remark: r.remark,
        createdAt: r.created_at,
      };
    }) || [];

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Return records API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建退库记录
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { outboundId, projectId, items, remark } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "请添加至少一个退库物料" }, { status: 400 });
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
      totalAmount += (item.price || 0) * (item.quantity || 0);
    }

    // 创建退库记录
    await db.prepare(`
      INSERT INTO return_records (id, outbound_id, project_id, operator_id, total_amount, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(recordId, outboundId || null, projectId || null, operatorId, totalAmount, remark || null, now).run();

    // 创建退库明细并更新库存（增加库存）
    for (const item of items) {
      const itemId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO return_items (id, return_id, material_id, quantity, unit_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(itemId, recordId, item.materialId, item.quantity, item.price || 0, now).run();

      // 更新物料库存（退库是增加库存）
      await db.prepare(`
        UPDATE materials SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?
      `).bind(item.quantity, now, item.materialId).run();
    }

    return NextResponse.json({ success: true, data: { id: recordId } });
  } catch (error) {
    console.error("Create return record error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
