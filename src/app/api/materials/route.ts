import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withPermission, hasPermission, getPermissionContext } from "@/lib/auth/permission-check";

// GET - 获取所有物料
export async function GET(request: NextRequest) {
  const { authorized } = await withPermission(request, "material:view");
  
  if (!authorized) {
    return NextResponse.json({ success: false, error: "没有权限查看物料" }, { status: 403 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const materialsResult = await db.prepare("SELECT * FROM materials ORDER BY updated_at DESC").all();
    const categoriesResult = await db.prepare("SELECT * FROM categories").all();
    
    const categoriesMap = new Map();
    categoriesResult.results?.forEach((c: any) => categoriesMap.set(c.id, c));

    const materials = materialsResult.results?.map((m: any) => ({
      id: m.id,
      name: m.name,
      categoryId: m.category_id,
      categoryName: m.category_id ? categoriesMap.get(m.category_id)?.name || "未分类" : "未分类",
      spec: m.spec,
      unit: m.unit,
      purchasePrice: m.purchase_price,
      salePrice: m.sale_price,
      stockQuantity: m.stock_quantity,
      minStockWarning: m.min_stock_warning,
      isLowStock: m.stock_quantity <= m.min_stock_warning && m.min_stock_warning > 0,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    })) || [];

    return NextResponse.json({ success: true, data: materials });
  } catch (error) {
    console.error("Materials API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建物料
export async function POST(request: NextRequest) {
  const { authorized, ctx } = await withPermission(request, "material:create");
  
  if (!authorized) {
    return NextResponse.json({ success: false, error: "没有权限创建物料" }, { status: 403 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { name, categoryId, spec, unit, purchasePrice, salePrice, stockQuantity, minStockWarning } = body;

    if (!name || !unit) {
      return NextResponse.json({ success: false, error: "名称和单位不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await db.prepare(`
      INSERT INTO materials (id, name, category_id, spec, unit, purchase_price, sale_price, stock_quantity, min_stock_warning, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, name, categoryId || null, spec || null, unit, purchasePrice || 0, salePrice || 0, stockQuantity || 0, minStockWarning || 0, now, now).run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Create material error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新物料
export async function PUT(request: NextRequest) {
  const { authorized } = await withPermission(request, "material:update");
  
  if (!authorized) {
    return NextResponse.json({ success: false, error: "没有权限编辑物料" }, { status: 403 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, name, categoryId, spec, unit, purchasePrice, salePrice, stockQuantity, minStockWarning } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "物料ID不能为空" }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); values.push(name); }
    if (categoryId !== undefined) { updates.push("category_id = ?"); values.push(categoryId || null); }
    if (spec !== undefined) { updates.push("spec = ?"); values.push(spec || null); }
    if (unit !== undefined) { updates.push("unit = ?"); values.push(unit); }
    if (purchasePrice !== undefined) { updates.push("purchase_price = ?"); values.push(purchasePrice || 0); }
    if (salePrice !== undefined) { updates.push("sale_price = ?"); values.push(salePrice || 0); }
    if (stockQuantity !== undefined) { updates.push("stock_quantity = ?"); values.push(stockQuantity || 0); }
    if (minStockWarning !== undefined) { updates.push("min_stock_warning = ?"); values.push(minStockWarning || 0); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "没有需要更新的字段" }, { status: 400 });
    }

    updates.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    await db.prepare(`UPDATE materials SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update material error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除物料
export async function DELETE(request: NextRequest) {
  const { authorized } = await withPermission(request, "material:delete");
  
  if (!authorized) {
    return NextResponse.json({ success: false, error: "没有权限删除物料" }, { status: 403 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "物料ID不能为空" }, { status: 400 });
    }

    await db.prepare("DELETE FROM materials WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete material error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
