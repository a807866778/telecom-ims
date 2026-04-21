import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取出库记录详情
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

    // 获取出库记录
    const recordResult = await db.prepare("SELECT * FROM outbound_records WHERE id = ?").bind(id).all();

    if (!recordResult.results || recordResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "出库记录不存在" }, { status: 404 });
    }

    const r = recordResult.results[0] as any;

    // 获取项目
    let projectName = "未知项目";
    if (r.project_id) {
      const projectResult = await db.prepare("SELECT name FROM projects WHERE id = ?").bind(r.project_id).all();
      if (projectResult.results && projectResult.results.length > 0) {
        projectName = projectResult.results[0].name;
      }
    }

    // 获取出库明细
    const itemsResult = await db.prepare(`
      SELECT oi.*, m.name as material_name, m.spec as material_spec, m.unit as material_unit
      FROM outbound_items oi
      JOIN materials m ON oi.material_id = m.id
      WHERE oi.outbound_id = ?
    `).bind(id).all();

    return NextResponse.json({
      success: true,
      data: {
        record: {
          id: r.id,
          projectId: r.project_id,
          projectName,
          totalAmount: r.total_amount || 0,
          notes: r.remark,
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
    console.error("Outbound detail API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
