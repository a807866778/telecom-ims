import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取入库记录详情
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

    // 获取入库记录
    const recordResult = await db.prepare("SELECT * FROM inbound_records WHERE id = ?").bind(id).all();

    if (!recordResult.results || recordResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "入库记录不存在" }, { status: 404 });
    }

    const r = recordResult.results[0] as any;

    // 获取供应商
    let supplierName = "未知供应商";
    if (r.supplier_id) {
      const supplierResult = await db.prepare("SELECT name FROM suppliers WHERE id = ?").bind(r.supplier_id).all();
      if (supplierResult.results && supplierResult.results.length > 0) {
        supplierName = supplierResult.results[0].name;
      }
    }

    // 获取操作员
    let operatorName = "未知";
    if (r.operator_id) {
      const userResult = await db.prepare("SELECT real_name FROM users WHERE id = ?").bind(r.operator_id).all();
      if (userResult.results && userResult.results.length > 0) {
        operatorName = userResult.results[0].real_name;
      }
    }

    // 获取入库明细
    const itemsResult = await db.prepare(`
      SELECT ii.*, m.name as material_name, m.spec as material_spec, m.unit as material_unit
      FROM inbound_items ii
      JOIN materials m ON ii.material_id = m.id
      WHERE ii.inbound_id = ?
    `).bind(id).all();

    return NextResponse.json({
      success: true,
      data: {
        record: {
          id: r.id,
          supplierId: r.supplier_id,
          supplierName,
          operatorId: r.operator_id,
          operatorName,
          totalAmount: r.total_amount || 0,
          notes: r.remark,
          photoUrl: r.photo_url,
          createdAt: r.created_at,
        },
        items: (itemsResult.results || []).map((item: any) => ({
          id: item.id,
          materialId: item.material_id,
          materialName: item.material_name,
          materialSpec: item.material_spec,
          unit: item.material_unit,
          quantity: item.quantity,
          price: item.unit_price || 0,
        })),
      }
    });
  } catch (error) {
    console.error("Inbound detail API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
