import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date"); // format: 2026-04-19

    if (!date) {
      return NextResponse.json({ success: false, error: "缺少date参数" }, { status: 400 });
    }

    // 计算当天时间范围
    const [y, m, d] = date.split("-").map(Number);
    const startDate = new Date(y, m - 1, d, 0, 0, 0);
    const endDate = new Date(y, m - 1, d, 23, 59, 59, 999);
    const startTs = startDate.getTime();
    const endTs = endDate.getTime();

    // 出库记录
    const outboundsRes = await db
      .prepare(
        `SELECT ob.*, p.name as project_name
         FROM outbound_records ob
         LEFT JOIN projects p ON ob.project_id = p.id
         WHERE ob.created_at >= ? AND ob.created_at <= ?
         ORDER BY ob.created_at DESC`
      )
      .bind(startTs, endTs)
      .all();

    const outbounds = outboundsRes.results?.map((r: any) => ({
      id: r.id,
      orderNo: r.order_no,
      projectName: r.project_name,
      status: r.status,
      createdAt: r.created_at,
    })) || [];

    // 出库金额
    let revenue = 0;
    let cost = 0;

    for (const ob of outboundsRes.results || []) {
      const itemsRes = await db
        .prepare(
          `SELECT oi.quantity, m.sale_price, m.purchase_price
           FROM outbound_items oi
           LEFT JOIN materials m ON oi.material_id = m.id
           WHERE oi.outbound_id = ?`
        )
        .bind((ob as any).id)
        .all();

      for (const item of itemsRes.results || []) {
        const it = item as any;
        revenue += (it.quantity || 0) * (it.sale_price || 0);
        cost += (it.quantity || 0) * (it.purchase_price || 0);
      }
    }

    // 入库记录
    const inboundsRes = await db
      .prepare(
        `SELECT * FROM inbound_records
         WHERE created_at >= ? AND created_at <= ?
         ORDER BY created_at DESC`
      )
      .bind(startTs, endTs)
      .all();

    const inbounds = inboundsRes.results?.map((r: any) => ({
      id: r.id,
      orderNo: r.order_no,
      status: r.status,
      createdAt: r.created_at,
    })) || [];

    // 采购订单
    const purchasesRes = await db
      .prepare(
        `SELECT po.*, s.name as supplier_name
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.id
         WHERE po.created_at >= ? AND po.created_at <= ?
         ORDER BY po.created_at DESC`
      )
      .bind(startTs, endTs)
      .all();

    let purchaseTotal = 0;
    const purchases = purchasesRes.results?.map((r: any) => {
      purchaseTotal += r.total_amount || 0;
      return {
        id: r.id,
        orderNo: r.order_no,
        supplierName: r.supplier_name,
        totalAmount: r.total_amount || 0,
        createdAt: r.created_at,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: {
        date,
        outbounds,
        inbounds,
        purchases,
        summary: {
          outboundCount: outbounds.length,
          inboundCount: inbounds.length,
          purchaseCount: purchases.length,
          revenue,
          cost,
          profit: revenue - cost,
          purchaseTotal,
        },
      },
    });
  } catch (error) {
    console.error("Daily report error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
