import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取物料详情
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "缺少物料ID" }, { status: 400 });
    }

    const materialResult = await db.prepare("SELECT * FROM materials WHERE id = ?").bind(id).all();

    if (!materialResult.results || materialResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "物料不存在" }, { status: 404 });
    }

    const m = materialResult.results[0] as any;

    // 获取分类信息
    let categoryName = "未分类";
    if (m.category_id) {
      const catResult = await db.prepare("SELECT name FROM categories WHERE id = ?").bind(m.category_id).all();
      if (catResult.results && catResult.results.length > 0) {
        categoryName = catResult.results[0].name;
      }
    }

    // 获取入库记录
    const inboundResult = await db.prepare(`
      SELECT ii.quantity, ii.price, ir.created_at, s.name as supplier_name
      FROM inbound_items ii
      JOIN inbound_records ir ON ii.inbound_id = ir.id
      LEFT JOIN suppliers s ON ir.supplier_id = s.id
      WHERE ii.material_id = ?
      ORDER BY ii.created_at DESC
    `).bind(id).all();

    // 获取出库记录
    const outboundResult = await db.prepare(`
      SELECT oi.quantity, oi.price, or.created_at
      FROM outbound_items oi
      JOIN outbound_records or ON oi.outbound_id = or.id
      WHERE oi.material_id = ?
      ORDER BY oi.created_at DESC
    `).bind(id).all();

    return NextResponse.json({
      success: true,
      data: {
        material: {
          id: m.id,
          name: m.name,
          categoryId: m.category_id,
          categoryName,
          spec: m.spec,
          unit: m.unit,
          purchasePrice: m.purchase_price || 0,
          salePrice: m.sale_price || 0,
          stockQuantity: m.stock_quantity || 0,
          minStockWarning: m.min_stock_warning || 0,
          notes: m.notes,
          createdAt: m.created_at,
        },
        inbound: (inboundResult.results || []).map((r: any) => ({
          id: r.id || crypto.randomUUID(),
          quantity: r.quantity,
          price: r.price || 0,
          supplierName: r.supplier_name,
          createdAt: r.created_at,
        })),
        outbound: (outboundResult.results || []).map((r: any) => ({
          id: r.id || crypto.randomUUID(),
          quantity: r.quantity,
          price: r.price || 0,
          createdAt: r.created_at,
        })),
      }
    });
  } catch (error) {
    console.error("Material detail API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
