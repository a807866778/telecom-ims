import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取退库记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    // 获取退库记录
    const recordResult = await db.prepare("SELECT * FROM return_records WHERE id = ?").bind(id).first();
    if (!recordResult) {
      return NextResponse.json({ success: false, error: "退库记录不存在" }, { status: 404 });
    }

    // 获取关联信息
    const projectResult = recordResult.project_id
      ? await db.prepare("SELECT * FROM projects WHERE id = ?").bind(recordResult.project_id).first()
      : null;

    const operatorResult = await db.prepare("SELECT * FROM users WHERE id = ?").bind(recordResult.operator_id).first();
    const outboundResult = await db.prepare("SELECT * FROM outbound_records WHERE id = ?").bind(recordResult.outbound_id).first();

    // 获取退库明细
    const itemsResult = await db.prepare("SELECT * FROM return_items WHERE return_id = ?").bind(id).all();
    const materialsResult = await db.prepare("SELECT * FROM materials").all();

    const materialsMap = new Map();
    materialsResult.results?.forEach((m: any) => materialsMap.set(m.id, m));

    const items = itemsResult.results?.map((i: any) => {
      const material = materialsMap.get(i.material_id);
      return {
        id: i.id,
        materialId: i.material_id,
        materialName: material?.name || "未知物料",
        materialSpec: material?.spec,
        materialUnit: material?.unit,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.quantity * i.unit_price,
      };
    }) || [];

    const record = {
      id: recordResult.id,
      outboundId: recordResult.outbound_id,
      projectId: recordResult.project_id,
      projectName: projectResult?.name || "未知项目",
      operatorId: recordResult.operator_id,
      operatorName: operatorResult?.real_name || "未知",
      outboundCreatedAt: outboundResult?.created_at,
      totalAmount: recordResult.total_amount || 0,
      remark: recordResult.remark,
      createdAt: recordResult.created_at,
      items,
    };

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("Get return record error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除退库记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    // 获取退库明细以恢复库存
    const itemsResult = await db.prepare("SELECT * FROM return_items WHERE return_id = ?").bind(id).all();

    // 恢复库存（减去退库数量）
    const now = Date.now();
    for (const item of itemsResult.results || []) {
      await db.prepare(`
        UPDATE materials SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?
      `).bind(item.quantity, now, item.material_id).run();
    }

    // 删除退库明细
    await db.prepare("DELETE FROM return_items WHERE return_id = ?").bind(id).run();

    // 删除退库记录
    await db.prepare("DELETE FROM return_records WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("Delete return record error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
