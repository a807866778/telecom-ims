import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取项目汇总数据
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "monthly"; // daily, monthly, yearly
    const projectId = url.searchParams.get("projectId"); // 可选的项目ID筛选
    const startDate = url.searchParams.get("startDate"); // 可选的开始日期
    const endDate = url.searchParams.get("endDate"); // 可选的结束日期

    // 获取所有项目
    const projectsResult = await db.prepare(`
      SELECT id, name, status, client_name, total_revenue, total_cost, total_profit 
      FROM projects 
      ORDER BY created_at DESC
    `).all();

    // 构建汇总数据
    let summaryData: any = {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      projectCount: 0,
      projectStats: [] as any[],
      dailyStats: [] as any[],
    };

    // 按项目统计
    let filteredProjects = projectsResult.results || [];
    if (projectId) {
      filteredProjects = filteredProjects.filter((p: any) => p.id === projectId);
    }

    for (const project of filteredProjects) {
      summaryData.totalRevenue += project.total_revenue || 0;
      summaryData.totalCost += project.total_cost || 0;
      summaryData.totalProfit += project.total_profit || 0;
      summaryData.projectCount++;

      summaryData.projectStats.push({
        id: project.id,
        name: project.name,
        status: project.status,
        clientName: project.client_name,
        revenue: project.total_revenue || 0,
        cost: project.total_cost || 0,
        profit: project.total_profit || 0,
      });
    }

    // 按时间维度获取出库数据用于趋势图
    let dateFormat: string;
    let groupBy: string;
    const now = Date.now();

    switch (type) {
      case "daily":
        dateFormat = "%Y-%m-%d";
        groupBy = "date(created_at / 1000, 'unixepoch')";
        break;
      case "yearly":
        dateFormat = "%Y";
        groupBy = "strftime('%Y', created_at / 1000, 'unixepoch')";
        break;
      case "monthly":
      default:
        dateFormat = "%Y-%m";
        groupBy = "strftime('%Y-%m', created_at / 1000, 'unixepoch')";
        break;
    }

    // 获取出库记录统计
    let outboundQuery = `
      SELECT 
        strftime('${dateFormat}', created_at / 1000, 'unixepoch') as period,
        SUM(total_amount) as amount,
        COUNT(*) as count
      FROM outbound_records
    `;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (startDate) {
      conditions.push("created_at >= ?");
      queryParams.push(new Date(startDate).getTime());
    }
    if (endDate) {
      conditions.push("created_at <= ?");
      queryParams.push(new Date(endDate).getTime() + 86400000); // 包含结束日期
    }
    if (projectId) {
      conditions.push("project_id = ?");
      queryParams.push(projectId);
    }

    if (conditions.length > 0) {
      outboundQuery += " WHERE " + conditions.join(" AND ");
    }

    outboundQuery += ` GROUP BY ${groupBy} ORDER BY period`;

    const outboundStats = await db.prepare(outboundQuery).bind(...queryParams).all();

    summaryData.dailyStats = (outboundStats.results || []).map((s: any) => ({
      period: s.period,
      revenue: s.amount || 0,
      count: s.count || 0,
    }));

    // 如果没有数据，生成最近6个月的模拟数据（用于展示）
    if (summaryData.dailyStats.length === 0) {
      const months = [];
      const d = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(d.getFullYear(), d.getMonth() - i, 1);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        months.push({
          period: monthStr,
          revenue: 0,
          count: 0,
        });
      }
      summaryData.dailyStats = months;
    }

    return NextResponse.json({ success: true, data: summaryData });
  } catch (error) {
    console.error("Projects summary API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
