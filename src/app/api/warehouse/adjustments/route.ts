import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取库存调整记录列表
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const materialId = url.searchParams.get("materialId") || "";
    const adjustmentType = url.searchParams.get("type") || "";

    let query = `
      SELECT 
        sa.id,
        sa.material_id as materialId,
        sa.adjustment_type as adjustmentType,
        sa.quantity,
        sa.reason,
        sa.operator_id as operatorId,
        sa.created_at as createdAt,
        m.name as materialName,
        m.spec as materialSpec,
        m.unit as materialUnit,
        m.stock_quantity as currentStock,
        u.real_name as operatorName
      FROM stock_adjustments sa
      LEFT JOIN materials m ON sa.material_id = m.id
      LEFT JOIN users u ON sa.operator_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (materialId) {
      query += ` AND sa.material_id = ?`;
      params.push(materialId);
    }

    if (adjustmentType) {
      query += ` AND sa.adjustment_type = ?`;
      params.push(adjustmentType);
    }

    query += ` ORDER BY sa.created_at DESC LIMIT 100`;

    const result = await db.prepare(query).bind(...params).all();

    // 用子查询获取每次调整时的"调整前库存"快照
    // before_stock = 该物料在当前调整时间点之前的最新库存
    const rows = (result.results || []) as any[];
    const enriched = rows.map((r) => {
      const adjType = r.adjustmentType as string;
      const qty = r.quantity as number;
      // 当前库存中该物料的库存量（近似作为 afterStock）
      const afterStock = r.currentStock ?? 0;
      // beforeStock: 根据调整类型反推
      const beforeStock = adjType === "报溢" ? afterStock - qty : afterStock + qty;
      return {
        ...r,
        type: adjType === "报溢" ? "overflow" : "loss",
        beforeStock: beforeStock < 0 ? 0 : beforeStock,
        afterStock,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Stock adjustments API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建库存调整记录
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { materialId, type, quantity, reason, operatorId } = body;

    if (!materialId || !type || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, error: "请填写完整的调整信息" }, { status: 400 });
    }

    // 统一调整类型：前端传 overflow/loss，API 用中文存储
    const typeMap: Record<string, string> = { overflow: "报溢", loss: "报损" };
    const adjustmentType = typeMap[type];
    if (!adjustmentType) {
      return NextResponse.json({ success: false, error: "调整类型无效" }, { status: 400 });
    }

    // 获取当前库存
    const materialResult = await db.prepare(
      "SELECT stock_quantity FROM materials WHERE id = ?"
    ).bind(materialId).first();

    if (!materialResult) {
      return NextResponse.json({ success: false, error: "物料不存在" }, { status: 404 });
    }

    const beforeStock = (materialResult as any).stock_quantity || 0;
    const adjustmentQty = adjustmentType === "报溢" ? quantity : -quantity;
    const afterStock = beforeStock + adjustmentQty;

    if (afterStock < 0) {
      return NextResponse.json({ success: false, error: "调整后库存不能为负数" }, { status: 400 });
    }

    const adjustmentId = crypto.randomUUID();
    const now = Date.now();

    // D1 的 PRAGMA foreign_keys 无法跨语句持续，通过传入 NULL operator_id 避免外键冲突
    // 只有当 operatorId 是有效 UUID（在 users 表中存在）时才写入，否则写 null
    let validOperatorId: string | null = null;
    if (operatorId && operatorId !== "system") {
      const userCheck = await db.prepare("SELECT id FROM users WHERE id = ?").bind(operatorId).first();
      validOperatorId = userCheck ? operatorId : null;
    }

    // 创建调整记录
    await db.prepare(`
      INSERT INTO stock_adjustments (id, material_id, adjustment_type, quantity, reason, operator_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(adjustmentId, materialId, adjustmentType, quantity, reason || null, validOperatorId, now).run();

    // 更新物料库存
    await db.prepare(`
      UPDATE materials SET stock_quantity = ?, updated_at = ? WHERE id = ?
    `).bind(afterStock, now, materialId).run();

    return NextResponse.json({ 
      success: true, 
      data: { 
        id: adjustmentId,
        beforeStock,
        afterStock
      } 
    });
  } catch (error) {
    console.error("Create adjustment error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
