import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有投诉
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db
      .prepare(
        `SELECT c.*, p.name as project_name, u.real_name as handler_name
         FROM complaints c
         LEFT JOIN projects p ON c.project_id = p.id
         LEFT JOIN users u ON c.handler_id = u.id
         ORDER BY c.created_at DESC`
      )
      .all();

    const data =
      result.results?.map((c: any) => ({
        id: c.id,
        projectId: c.project_id,
        projectName: c.project_name || c.project_name_text,
        customerName: c.customer_name,
        customerPhone: c.customer_phone,
        content: c.content,
        status: c.status,
        handlerId: c.handler_id,
        handlerName: c.handler_name,
        solution: c.solution,
        resolveDate: c.resolve_date,
        remark: c.remark,
        photos: c.photos ? JSON.parse(c.photos) : [],
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })) || [];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Complaints GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建投诉
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { projectId, projectName, customerName, customerPhone, content, remark, photos } = body;

    if (!content) {
      return NextResponse.json({ success: false, error: "投诉内容不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    // 如果 projectId 为 null 且有 projectName，说明是自定义项目名，存到 project_name_text 字段
    const projectIdToSave = projectId || null;
    const projectNameText = !projectId && projectName ? projectName : null;
    const photosJson = photos && photos.length > 0 ? JSON.stringify(photos) : null;

    // 禁用外键约束
    await db.prepare("PRAGMA foreign_keys = OFF").run();
    try {
      await db
        .prepare(
          `INSERT INTO complaints (id, project_id, project_name_text, customer_name, customer_phone, content, status, remark, photos, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, projectIdToSave, projectNameText, customerName || null, customerPhone || null, content, "待处理", remark || null, photosJson, now, now)
        .run();
    } finally {
      await db.prepare("PRAGMA foreign_keys = ON").run();
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Complaints POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新投诉
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, status, solution, handlerId, photos } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    const now = Date.now();

    if (solution && status === "已解决") {
      const photosJson = photos && photos.length > 0 ? JSON.stringify(photos) : null;
      await db
        .prepare("UPDATE complaints SET solution = ?, status = ?, resolve_date = ?, photos = COALESCE(?, photos), updated_at = ? WHERE id = ?")
        .bind(solution, status, now, photosJson, now, id)
        .run();
    } else {
      const updates: string[] = [];
      const values: any[] = [];

      if (status) { updates.push("status = ?"); values.push(status); }
      if (handlerId) { updates.push("handler_id = ?"); values.push(handlerId); }
      if (solution) { updates.push("solution = ?"); values.push(solution); }
      if (photos) { updates.push("photos = ?"); values.push(JSON.stringify(photos)); }
      updates.push("updated_at = ?");
      values.push(now);
      values.push(id);

      await db
        .prepare(`UPDATE complaints SET ${updates.join(", ")} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complaints PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除投诉
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

    await db.prepare("DELETE FROM complaints WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complaints DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
