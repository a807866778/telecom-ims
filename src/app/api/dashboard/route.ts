import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "day"; // day | month | year

    if (!db) {
      return NextResponse.json(
        { success: false, error: "数据库不可用" },
        { status: 500 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    // ========== 基础统计 ==========
    const materialsCnt = await db.prepare("SELECT COUNT(*) as cnt FROM materials").first();
    const totalMaterials = materialsCnt?.cnt || 0;

    // 低库存预警
    const lowStockMaterials = (await db
      .prepare("SELECT * FROM materials WHERE min_stock_warning > 0")
      .all())
      .results?.filter((m: any) => m.stock_quantity <= m.min_stock_warning) || [];

    // 进行中项目数
    const projectsCnt = await db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = '进行中'").first();
    const activeProjects = projectsCnt?.cnt || 0;

    // 今日出入库记录数
    const todayOutboundsCnt = await db
      .prepare("SELECT COUNT(*) as cnt FROM outbound_records WHERE created_at >= ?")
      .bind(todayTimestamp)
      .first();
    const todayOutbounds = todayOutboundsCnt?.cnt || 0;

    const todayInboundsCnt = await db
      .prepare("SELECT COUNT(*) as cnt FROM inbound_records WHERE created_at >= ?")
      .bind(todayTimestamp)
      .first();
    const todayInbounds = todayInboundsCnt?.cnt || 0;

    // ========== 今日利润 ==========
    const todayOutboundsListResult = await db
      .prepare("SELECT id FROM outbound_records WHERE created_at >= ?")
      .bind(todayTimestamp)
      .all();
    const todayOutboundIds = (todayOutboundsListResult.results || []).map((r: any) => r.id);

    let todayRevenue = 0;
    let todayCost = 0;

    if (todayOutboundIds.length > 0) {
      const placeholders = todayOutboundIds.map(() => "?").join(",");
      const todayItemsResult = await db
        .prepare(`
          SELECT oi.*, m.sale_price, m.purchase_price
          FROM outbound_items oi
          LEFT JOIN materials m ON oi.material_id = m.id
          WHERE oi.outbound_id IN (${placeholders})
        `)
        .bind(...todayOutboundIds)
        .all();

      for (const item of todayItemsResult.results || []) {
        if (item.sale_price) todayRevenue += item.quantity * item.sale_price;
        if (item.purchase_price) todayCost += item.quantity * item.purchase_price;
      }
    }

    // ========== 按 period 统计区间利润 ==========
    let periodStartTimestamp: number;
    const periodLabel = period === "day" ? "今日" : period === "month" ? "本月" : "本年";

    if (period === "year") {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      periodStartTimestamp = startOfYear.getTime();
    } else if (period === "month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      periodStartTimestamp = startOfMonth.getTime();
    } else {
      periodStartTimestamp = todayTimestamp;
    }

    let periodRevenue = period === "day" ? todayRevenue : 0;
    let periodCost = period === "day" ? todayCost : 0;

    if (period !== "day") {
      const periodOutboundsResult = await db
        .prepare("SELECT id FROM outbound_records WHERE created_at >= ?")
        .bind(periodStartTimestamp)
        .all();
      const periodOutboundIds = (periodOutboundsResult.results || []).map((r: any) => r.id);

      if (periodOutboundIds.length > 0) {
        const placeholders = periodOutboundIds.map(() => "?").join(",");
        const periodItemsResult = await db
          .prepare(`
            SELECT oi.quantity, m.sale_price, m.purchase_price
            FROM outbound_items oi
            LEFT JOIN materials m ON oi.material_id = m.id
            WHERE oi.outbound_id IN (${placeholders})
          `)
          .bind(...periodOutboundIds)
          .all();

        for (const item of periodItemsResult.results || []) {
          if (item.sale_price) periodRevenue += item.quantity * item.sale_price;
          if (item.purchase_price) periodCost += item.quantity * item.purchase_price;
        }
      }
    }

    const periodProfit = periodRevenue - periodCost;

    // ========== 最近的出库记录 ==========
    const recentOutboundsRawResult = await db
      .prepare(`
        SELECT o.id, o.project_id, o.created_at, p.name as project_name
        FROM outbound_records o
        LEFT JOIN projects p ON o.project_id = p.id
        ORDER BY o.created_at DESC
        LIMIT 5
      `)
      .all();
    const recentOutboundsRaw = recentOutboundsRawResult.results || [];

    const recentOutbounds = recentOutboundsRaw.map((record: any) => ({
      id: record.id,
      projectName: record.project_name || "未知项目",
      createdAt: new Date(record.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    }));

    // ========== 库存预警列表 ==========
    const categoriesResult = await db.prepare("SELECT * FROM categories").all();
    const categoriesMap = new Map();
    categoriesResult.results?.forEach((c: any) => categoriesMap.set(c.id, c));

    const lowStockWithDetails = lowStockMaterials.slice(0, 5).map((material: any) => ({
      id: material.id,
      name: material.name,
      spec: material.spec,
      unit: material.unit,
      stockQuantity: material.stock_quantity,
      minStockWarning: material.min_stock_warning,
      categoryName: material.category_id ? categoriesMap.get(material.category_id)?.name || "未分类" : "未分类",
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalMaterials,
        activeProjects,
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        todayCost: Math.round(todayCost * 100) / 100,
        todayInbounds: Number(todayInbounds),
        todayOutbounds: Number(todayOutbounds),
        lowStockMaterials: lowStockWithDetails,
        recentOutbounds,
        // 新增：按 period 统计的汇总利润
        periodProfit: Math.round(periodProfit * 100) / 100,
        periodRevenue: Math.round(periodRevenue * 100) / 100,
        periodCost: Math.round(periodCost * 100) / 100,
        periodLabel,
        period,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
