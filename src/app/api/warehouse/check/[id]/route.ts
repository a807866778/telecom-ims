import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取盘点详情
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

    // 获取盘点主表
    const checkResult = await db.prepare(`
      SELECT 
        sc.id,
        sc.check_date as checkDate,
        sc.status,
        sc.remark,
        sc.created_at as createdAt,
        sc.completed_at as completedAt,
        u.real_name as operatorName
      FROM stock_checks sc
      LEFT JOIN users u ON sc.operator_id = u.id
      WHERE sc.id = ?
    `).bind(id).first();

    if (!checkResult) {
      return NextResponse.json({ success: false, error: "盘点记录不存在" }, { status: 404 });
    }

    // 获取盘点明细
    const itemsResult = await db.prepare(`
      SELECT 
        sci.id,
        sci.material_id as materialId,
        sci.system_quantity as systemStock,
        sci.actual_quantity as actualStock,
        sci.diff_quantity as difference,
        sci.remark,
        m.name as materialName,
        m.spec as materialSpec,
        m.unit as materialUnit,
        0 as isAdjusted
      FROM stock_check_items sci
      LEFT JOIN materials m ON sci.material_id = m.id
      WHERE sci.check_id = ?
      ORDER BY m.name
    `).bind(id).all();

    // 规范化 status 字段：统一前端期望的 "pending" / "completed"
    const rawStatus = (checkResult as any).status;
    const normalizedStatus = (rawStatus === "已完成") ? "completed" : "pending";
    const checkMonth = (checkResult as any).checkDate 
      ? new Date((checkResult as any).checkDate).toISOString().slice(0, 7)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        id: (checkResult as any).id,
        checkMonth,
        status: normalizedStatus,
        remark: (checkResult as any).remark,
        createdAt: (checkResult as any).createdAt,
        completedAt: (checkResult as any).completedAt || null,
        operatorName: (checkResult as any).operatorName,
        totalItems: (itemsResult.results || []).length,
        diffItems: (itemsResult.results || []).filter((i: any) => i.difference !== 0).length,
        items: itemsResult.results || [],
      },
    });
  } catch (error) {
    console.error("Stock check detail API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新盘点（录入实际库存、完成盘点、调整库存）
export async function PUT(
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
    const body = await request.json();
    const { action, items, operatorId } = body;

    // 检查盘点状态
    const checkResult = await db.prepare(
      "SELECT status FROM stock_checks WHERE id = ?"
    ).bind(id).first();

    if (!checkResult) {
      return NextResponse.json({ success: false, error: "盘点记录不存在" }, { status: 404 });
    }

    // 只有 updateItems 和 complete 动作需要检查状态；adjust 动作在 completed 状态下也允许执行
    if (action !== "adjust" && (checkResult as any).status === "已完成") {
      return NextResponse.json({ success: false, error: "盘点已完成，无法修改" }, { status: 400 });
    }

    const now = Date.now();

    // 更新实际库存（前端传 actualStock/difference）
    if (action === "updateItems" && items && items.length > 0) {
      for (const item of items) {
        const actualStock = item.actualStock ?? item.actualQuantity ?? 0;
        const diff = item.difference ?? (actualStock - (item.systemStock || item.systemQuantity || 0));
        await db.prepare(`
          UPDATE stock_check_items 
          SET actual_quantity = ?, diff_quantity = ?, remark = ?
          WHERE id = ? AND check_id = ?
        `).bind(actualStock, diff, item.remark || null, item.id, id).run();
      }

      return NextResponse.json({ success: true });
    }

    // 完成盘点（不调整库存）
    if (action === "complete") {
      await db.prepare(`
        UPDATE stock_checks SET status = ?, completed_at = ? WHERE id = ?
      `).bind("已完成", now, id).run();

      return NextResponse.json({ success: true });
    }

    // 调整库存（将差异应用到实际库存）
    if (action === "adjust") {
      // 获取所有有差异且未调整的项（差异不为0即为有差异，这里简化处理）
      const diffItemsResult = await db.prepare(`
        SELECT 
          sci.id,
          sci.material_id as materialId,
          sci.actual_quantity as actualQuantity,
          sci.diff_quantity as diffQuantity,
          m.stock_quantity as currentStock
        FROM stock_check_items sci
        LEFT JOIN materials m ON sci.material_id = m.id
        WHERE sci.check_id = ? AND sci.diff_quantity != 0
      `).bind(id).all();

      const diffItems = diffItemsResult.results || [];

      // D1 不支持跨语句的 PRAGMA foreign_keys = OFF，改为校验 operatorId 有效性
      let validOperatorId: string | null = null;
      if (operatorId && operatorId !== "system") {
        const userCheck = await db.prepare("SELECT id FROM users WHERE id = ?").bind(operatorId).first();
        validOperatorId = userCheck ? operatorId : null;
      }

      for (const item of diffItems as any[]) {
        if (item.diffQuantity == null || item.diffQuantity === 0) continue;

        // 更新物料库存为实际盘点数量
        await db.prepare(`
          UPDATE materials SET stock_quantity = ?, updated_at = ? WHERE id = ?
        `).bind(item.actualQuantity, now, item.materialId).run();

        // 创建调整记录
        const adjustmentId = crypto.randomUUID();
        const adjType = item.diffQuantity > 0 ? "报溢" : "报损";
        await db.prepare(`
          INSERT INTO stock_adjustments (id, material_id, adjustment_type, quantity, reason, operator_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          adjustmentId,
          item.materialId,
          adjType,
          Math.abs(item.diffQuantity),
          `盘点调整 (${id.slice(0, 8)})`,
          validOperatorId,
          now
        ).run();
      }

      // 标记盘点已完成，并记录完成时间
      await db.prepare(`
        UPDATE stock_checks SET status = ?, completed_at = ? WHERE id = ?
      `).bind("已完成", now, id).run();

      return NextResponse.json({ 
        success: true, 
        data: { adjustedCount: diffItems.length } 
      });
    }

    return NextResponse.json({ success: false, error: "无效的操作" }, { status: 400 });
  } catch (error) {
    console.error("Update stock check error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
