import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取项目详情
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

    // 获取项目
    const projectResult = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).all();

    if (!projectResult.results || projectResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "项目不存在" }, { status: 404 });
    }

    const project = projectResult.results[0] as any;

    // 获取出库记录
    const outboundResult = await db.prepare(
      "SELECT * FROM outbound_records WHERE project_id = ? ORDER BY created_at DESC"
    ).bind(id).all();

    // 获取所有出库明细
    const outboundIds = outboundResult.results?.map((r: any) => r.id) || [];
    let itemsResult: any = { results: [] };

    if (outboundIds.length > 0) {
      const placeholders = outboundIds.map(() => "?").join(",");
      itemsResult = await db.prepare(
        `SELECT oi.*, m.name as material_name, m.spec as material_spec, m.unit as material_unit,
                m.purchase_price as material_purchase_price, m.sale_price as material_sale_price
         FROM outbound_items oi
         JOIN materials m ON oi.material_id = m.id
         WHERE oi.outbound_id IN (${placeholders})`
      ).bind(...outboundIds).all();
    }

    // 汇总物料
    const materialSummary: Record<string, any> = {};

    for (const item of itemsResult.results || []) {
      const mid = item.material_id;
      if (!materialSummary[mid]) {
        materialSummary[mid] = {
          id: mid,
          name: item.material_name,
          spec: item.material_spec,
          unit: item.material_unit,
          totalQuantity: 0,
          purchasePrice: item.material_purchase_price || 0,
          salePrice: item.material_sale_price || 0,
          totalCost: 0,
          totalRevenue: 0,
        };
      }
      materialSummary[mid].totalQuantity += item.quantity;
      materialSummary[mid].totalCost += item.quantity * (item.material_purchase_price || 0);
      materialSummary[mid].totalRevenue += item.quantity * (item.unit_price || 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          clientName: project.client_name,
          contactPerson: project.contact_person || "",
          contactPhone: project.contact_phone || "",
          address: project.address || "",
          bankAccount: project.bank_account || "",
          taxNumber: project.tax_number || "",
          invoiceTitle: project.invoice_title || "",
          status: project.status,
          startDate: project.start_date,
          endDate: project.end_date,
          totalRevenue: project.total_revenue || 0,
          totalCost: project.total_cost || 0,
          totalProfit: project.total_profit || 0,
          notes: project.notes,
          createdAt: project.created_at,
        },
        outboundRecords: outboundResult.results?.map((r: any) => ({
          id: r.id,
          totalAmount: r.total_amount || 0,
          notes: r.remark,
          createdAt: r.created_at,
        })) || [],
        materials: Object.values(materialSummary),
      }
    });
  } catch (error) {
    console.error("Project detail API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
