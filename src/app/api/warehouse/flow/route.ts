import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取物料流向查询
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const materialId = url.searchParams.get("materialId") || "";
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";

    if (!materialId) {
      return NextResponse.json({ success: false, error: "请选择物料" }, { status: 400 });
    }

    // 获取物料信息
    const materialResult = await db.prepare(`
      SELECT id, name, spec, unit, stock_quantity as stockQuantity 
      FROM materials WHERE id = ?
    `).bind(materialId).first();

    if (!materialResult) {
      return NextResponse.json({ success: false, error: "物料不存在" }, { status: 404 });
    }

    // 构建日期条件
    let dateCondition = "";
    const dateParams: any[] = [];
    
    if (startDate) {
      dateCondition += " AND flow.created_at >= ?";
      dateParams.push(new Date(startDate).getTime());
    }
    if (endDate) {
      dateCondition += " AND flow.created_at <= ?";
      dateParams.push(new Date(endDate).getTime() + 86400000);
    }

    // 1. 直接入库 (inbound_records)
    const inboundQuery = `
      SELECT 
        '直接入库' as type,
        ir.id as recordId,
        ir.created_at,
        ii.quantity,
        ii.unit_price as unitPrice,
        s.name as sourceName,
        u.real_name as operatorName,
        NULL as projectName,
        NULL as adjustmentReason,
        ir.remark,
        ir.photo_url as photoUrl
      FROM inbound_records ir
      INNER JOIN inbound_items ii ON ir.id = ii.inbound_id
      LEFT JOIN suppliers s ON ir.supplier_id = s.id
      LEFT JOIN users u ON ir.operator_id = u.id
      WHERE ii.material_id = ? ${dateCondition}
    `;

    // 2. 采购入库 (purchase_receipts)
    const purchaseQuery = `
      SELECT 
        '采购入库' as type,
        pr.id as recordId,
        pr.created_at,
        pri.quantity,
        pri.unit_price as unitPrice,
        COALESCE(s.name, po.supplier_id) as sourceName,
        u.real_name as operatorName,
        NULL as projectName,
        NULL as adjustmentReason,
        pr.remark,
        pr.photo_url as photoUrl
      FROM purchase_receipts pr
      INNER JOIN purchase_receipt_items pri ON pr.id = pri.receipt_id
      LEFT JOIN purchase_orders po ON pr.order_id = po.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON pr.operator_id = u.id
      WHERE pri.material_id = ? ${dateCondition}
    `;

    // 3. 报溢入库 (stock_adjustments)
    const surplusQuery = `
      SELECT 
        '报溢入库' as type,
        sa.id as recordId,
        sa.created_at,
        sa.quantity,
        0 as unitPrice,
        NULL as sourceName,
        u.real_name as operatorName,
        NULL as projectName,
        sa.reason as adjustmentReason,
        NULL as remark,
        NULL as photoUrl
      FROM stock_adjustments sa
      LEFT JOIN users u ON sa.operator_id = u.id
      WHERE sa.material_id = ? AND sa.adjustment_type = '报溢' ${dateCondition}
    `;

    // 4. 直接出库 (outbound_records)
    const outboundQuery = `
      SELECT 
        '直接出库' as type,
        out_rec.id as recordId,
        out_rec.created_at,
        oi.quantity,
        oi.unit_price as unitPrice,
        NULL as sourceName,
        u.real_name as operatorName,
        p.name as projectName,
        NULL as adjustmentReason,
        out_rec.remark,
        out_rec.photo_url as photoUrl
      FROM outbound_records out_rec
      INNER JOIN outbound_items oi ON out_rec.id = oi.outbound_id
      LEFT JOIN projects p ON out_rec.project_id = p.id
      LEFT JOIN users u ON out_rec.operator_id = u.id
      WHERE oi.material_id = ? ${dateCondition}
    `;

    // 5. 退货出库 (return_records)
    const returnQuery = `
      SELECT 
        '退货出库' as type,
        rr.id as recordId,
        rr.created_at,
        ri.quantity,
        ri.unit_price as unitPrice,
        NULL as sourceName,
        u.real_name as operatorName,
        p.name as projectName,
        NULL as adjustmentReason,
        rr.remark,
        NULL as photoUrl
      FROM return_records rr
      INNER JOIN return_items ri ON rr.id = ri.return_id
      LEFT JOIN outbound_records out_rec ON rr.outbound_id = out_rec.id
      LEFT JOIN projects p ON out_rec.project_id = p.id
      LEFT JOIN users u ON rr.operator_id = u.id
      WHERE ri.material_id = ? ${dateCondition}
    `;

    // 6. 报损出库 (stock_adjustments)
    const lossQuery = `
      SELECT 
        '报损出库' as type,
        sa.id as recordId,
        sa.created_at,
        sa.quantity,
        0 as unitPrice,
        NULL as sourceName,
        u.real_name as operatorName,
        NULL as projectName,
        sa.reason as adjustmentReason,
        NULL as remark,
        NULL as photoUrl
      FROM stock_adjustments sa
      LEFT JOIN users u ON sa.operator_id = u.id
      WHERE sa.material_id = ? AND sa.adjustment_type = '报损' ${dateCondition}
    `;

    // 执行所有查询
    const [inboundResult, purchaseResult, surplusResult, outboundResult, returnResult, lossResult] = await Promise.all([
      db.prepare(inboundQuery).bind(materialId, ...dateParams).all(),
      db.prepare(purchaseQuery).bind(materialId, ...dateParams).all(),
      db.prepare(surplusQuery).bind(materialId, ...dateParams).all(),
      db.prepare(outboundQuery).bind(materialId, ...dateParams).all(),
      db.prepare(returnQuery).bind(materialId, ...dateParams).all(),
      db.prepare(lossQuery).bind(materialId, ...dateParams).all(),
    ]);

    // 合并所有流向记录
    const allFlows = [
      ...(inboundResult.results || []),
      ...(purchaseResult.results || []),
      ...(surplusResult.results || []),
      ...(outboundResult.results || []),
      ...(returnResult.results || []),
      ...(lossResult.results || []),
    ].sort((a: any, b: any) => a.created_at - b.created_at);

    // 计算累计库存
    let runningBalance = 0;
    const flowsWithBalance = allFlows.map((flow: any) => {
      if (flow.type.includes('入库') || flow.type === '报溢入库') {
        runningBalance += flow.quantity;
      } else {
        runningBalance -= flow.quantity;
      }
      return {
        ...flow,
        timestamp: flow.created_at,
        balance: runningBalance,
      };
    });

    // 统计
    const totalInbound = allFlows
      .filter((f: any) => f.type.includes('入库'))
      .reduce((sum: number, f: any) => sum + f.quantity, 0);
    const totalOutbound = allFlows
      .filter((f: any) => f.type.includes('出库') || f.type === '报损出库')
      .reduce((sum: number, f: any) => sum + f.quantity, 0);

    return NextResponse.json({
      success: true,
      data: {
        material: materialResult,
        flows: flowsWithBalance,
        totalInbound,
        totalOutbound,
      },
    });
  } catch (error) {
    console.error("Stock flow API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
