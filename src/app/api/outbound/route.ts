import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有出库记录
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "projects") {
      const result = await db.prepare("SELECT id, name FROM projects WHERE status = '进行中' ORDER BY created_at DESC").all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    if (type === "materials") {
      const result = await db.prepare("SELECT id, name, spec, unit, stock_quantity, sale_price FROM materials WHERE stock_quantity > 0 ORDER BY name").all();
      return NextResponse.json({ success: true, data: result.results || [] });
    }

    const recordsResult = await db.prepare("SELECT * FROM outbound_records ORDER BY created_at DESC LIMIT 50").all();
    const projectsResult = await db.prepare("SELECT * FROM projects").all();
    const usersResult = await db.prepare("SELECT * FROM users").all();
    const itemsResult = await db.prepare("SELECT * FROM outbound_items").all();

    const projectsMap = new Map();
    projectsResult.results?.forEach((p: any) => projectsMap.set(p.id, p));

    const usersMap = new Map();
    usersResult.results?.forEach((u: any) => usersMap.set(u.id, u));

    const records = recordsResult.results?.map((r: any) => {
      const project = projectsMap.get(r.project_id);
      const operator = usersMap.get(r.operator_id);
      const items = itemsResult.results?.filter((i: any) => i.outbound_id === r.id) || [];

      return {
        id: r.id,
        projectId: r.project_id,
        projectName: project?.name || "未知项目",
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
    console.error("Outbound API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建出库单
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { projectId, items, notes } = body;

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
      totalAmount += (item.price || 0) * (item.quantity || 0);
    }

    // 创建出库记录
    await db.prepare(`
      INSERT INTO outbound_records (id, project_id, operator_id, total_amount, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(recordId, projectId || null, operatorId, totalAmount, notes || null, now).run();

      // 创建出库明细并更新库存
    for (const item of items) {
      const itemId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO outbound_items (id, outbound_id, material_id, quantity, unit_price, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(itemId, recordId, item.materialId, item.quantity, item.price || 0, now).run();

      // 更新物料库存
      await db.prepare(`
        UPDATE materials SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?
      `).bind(item.quantity, now, item.materialId).run();
    }

    return NextResponse.json({ success: true, data: { id: recordId } });
  } catch (error) {
    console.error("Create outbound error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
