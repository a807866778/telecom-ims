import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPermissionContext } from "@/lib/auth/permission-check";

// GET - 获取盘点列表
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db.prepare(`
      SELECT 
        sc.id,
        sc.check_date,
        sc.check_date as checkMonth,
        sc.status,
        sc.remark,
        sc.created_at as createdAt,
        sc.completed_at as completedAt,
        u.real_name as operatorName
      FROM stock_checks sc
      LEFT JOIN users u ON sc.operator_id = u.id
      ORDER BY sc.created_at DESC
    `).all();

    // 获取每个盘点的物料总数和差异数
    const data = await Promise.all(
      (result.results || []).map(async (r: any) => {
        const statsResult = await db.prepare(`
          SELECT 
            COUNT(*) as totalItems,
            SUM(CASE WHEN diff_quantity != 0 THEN 1 ELSE 0 END) as diffItems
          FROM stock_check_items
          WHERE check_id = ?
        `).bind(r.id).first();
        
        return {
          id: r.id,
          checkMonth: r.check_date ? new Date(r.check_date).toISOString().slice(0, 7) : null,
          status: r.status,
          remark: r.remark,
          createdAt: r.created_at,
          completedAt: r.completed_at || null,
          operatorName: r.operatorName || null,
          totalItems: statsResult ? (statsResult as any).totalItems || 0 : 0,
          diffItems: statsResult ? (statsResult as any).diffItems || 0 : 0,
        };
      })
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Stock check list API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建新盘点
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    // 获取当前用户
    const userCtx = await getPermissionContext(request);
    if (!userCtx) {
      return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { checkMonth } = body;

    if (!checkMonth) {
      return NextResponse.json({ success: false, error: "请选择盘点月份" }, { status: 400 });
    }

    const checkId = crypto.randomUUID();
    const now = Date.now();

    // 获取所有物料（使用 materials 表，因为 stock_check_items FK 引用 materials.id）
    const materialsResult = await db.prepare(
      "SELECT id, name, COALESCE(stock_quantity, 0) as stockQuantity FROM materials ORDER BY name"
    ).all();

    const materials = materialsResult.results || [];

    // 禁用外键约束
    await db.prepare("PRAGMA foreign_keys = OFF").run();
    try {
      // 创建盘点主表（checkMonth 格式如 "2026-04"，转为该月1日的时间戳）
      await db.prepare(`
        INSERT INTO stock_checks (id, check_date, status, remark, operator_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(checkId, new Date(checkMonth + "-01").getTime(), "进行中", body.remark || null, userCtx.userId, now).run();

      // 创建盘点明细（每条物料的账面数量）
      for (const material of materials as any[]) {
        const itemId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO stock_check_items (id, check_id, material_id, system_quantity, actual_quantity, diff_quantity, remark, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(itemId, checkId, material.id, material.stockQuantity || 0, material.stockQuantity || 0, 0, null, now).run();
      }
    } finally {
      await db.prepare("PRAGMA foreign_keys = ON").run();
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        id: checkId,
        totalItems: materials.length
      } 
    });
  } catch (error) {
    console.error("Create stock check error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
