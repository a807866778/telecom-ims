import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有商品档案
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db
      .prepare(
        `SELECT pa.*, d.name as distributor_name, c.name as category_name
         FROM product_archives pa
         LEFT JOIN distributors d ON pa.distributor_id = d.id
         LEFT JOIN categories c ON pa.category_id = c.id
         ORDER BY pa.updated_at DESC`
      )
      .all();

    const data =
      result.results?.map((p: any) => ({
        id: p.id,
        name: p.name,
        distributorId: p.distributor_id,
        distributorName: p.distributor_name,
        categoryId: p.category_id,
        categoryName: p.category_name,
        spec: p.spec,
        model: p.model,
        unit: p.unit,
        purchasePrice: p.purchase_price,
        salePrice: p.sale_price,
        specialRemark: p.special_remark,
        manualUrl: p.manual_url,
        certificateUrl: p.certificate_url,
        packagingUrl: p.packaging_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })) || [];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建商品档案
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { name, distributorId, categoryId, spec, model, unit, purchasePrice, salePrice, specialRemark } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "商品名称不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO product_archives (id, name, distributor_id, category_id, spec, model, unit, purchase_price, sale_price, special_remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, name, distributorId || null, categoryId || null, spec || null, model || null, unit, purchasePrice || 0, salePrice || 0, specialRemark || null, now, now)
      .run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新商品档案
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, name, distributorId, categoryId, spec, model, unit, purchasePrice, salePrice, specialRemark } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    const now = Date.now();

    await db
      .prepare(
        `UPDATE product_archives SET name = ?, distributor_id = ?, category_id = ?, spec = ?, model = ?, unit = ?, purchase_price = ?, sale_price = ?, special_remark = ?, updated_at = ? WHERE id = ?`
      )
      .bind(name, distributorId || null, categoryId || null, spec || null, model || null, unit, purchasePrice || 0, salePrice || 0, specialRemark || null, now, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Products PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除商品档案
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    await db.prepare("DELETE FROM product_archives WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Products DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
