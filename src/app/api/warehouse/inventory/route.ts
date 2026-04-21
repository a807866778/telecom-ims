import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取库存查询数据
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const categoryId = url.searchParams.get("categoryId") || "";

    let query = `
      SELECT 
        m.id,
        m.name,
        m.spec,
        m.unit,
        COALESCE(m.stock_quantity, 0) as stockQuantity,
        COALESCE(m.min_stock_warning, 0) as minStockWarning,
        m.purchase_price as purchasePrice,
        m.sale_price as salePrice,
        c.id as categoryId,
        c.name as categoryName
      FROM materials m
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (m.name LIKE ? OR m.spec LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      query += ` AND m.category_id = ?`;
      params.push(categoryId);
    }

    query += ` ORDER BY m.name`;

    const result = await db.prepare(query).bind(...params).all();

    const materials = (result.results || []).map((m: any) => ({
      ...m,
      isLowStock: m.stockQuantity < m.minStockWarning,
    }));

    return NextResponse.json({ success: true, data: materials });
  } catch (error) {
    console.error("Inventory API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
