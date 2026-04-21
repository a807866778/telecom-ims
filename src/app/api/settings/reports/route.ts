import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 生成报表
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "monthly";
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    // 计算时间范围
    let startTime: number;
    let endTime: number;

    if (type === "monthly") {
      startTime = new Date(year, month - 1, 1).getTime();
      endTime = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    } else {
      startTime = new Date(year, 0, 1).getTime();
      endTime = new Date(year + 1, 0, 0, 23, 59, 59, 999).getTime();
    }

    // 入库统计
    const inboundResult = await db
      .prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total FROM inbound_records WHERE created_at >= ? AND created_at <= ?")
      .bind(startTime, endTime)
      .first();

    // 出库统计
    const outboundResult = await db
      .prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total FROM outbound_records WHERE created_at >= ? AND created_at <= ?")
      .bind(startTime, endTime)
      .first();

    // 项目数据
    const projectsResult = await db
      .prepare("SELECT id, name, status, total_cost, total_revenue FROM projects ORDER BY created_at DESC")
      .all();

    // 培训统计
    const trainingResult = await db
      .prepare(
        `SELECT 
           COUNT(*) as total_completions,
           COALESCE(AVG(score), 0) as avg_score,
           SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pass_rate
         FROM training_records`
      )
      .first();

    const report: any = {
      period: type === "monthly" ? `${year}-${String(month).padStart(2, "0")}` : String(year),
      inboundCount: (inboundResult as any)?.cnt || 0,
      totalCost: (inboundResult as any)?.total || 0,
      outboundCount: (outboundResult as any)?.cnt || 0,
      totalRevenue: (outboundResult as any)?.total || 0,
      projects:
        projectsResult.results?.map((p: any) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          totalCost: p.total_cost,
          totalRevenue: p.total_revenue,
        })) || [],
      trainingStats: {
        totalCompletions: (trainingResult as any)?.total_completions || 0,
        avgScore: Math.round((trainingResult as any)?.avg_score || 0),
        passRate: Math.round((trainingResult as any)?.pass_rate || 0),
      },
    };

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
