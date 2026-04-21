import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有售后记录
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db
      .prepare(
        `SELECT a.*, p.name as project_name, m.name as product_name, d.name as distributor_name
         FROM after_sales a
         LEFT JOIN projects p ON a.project_id = p.id
         LEFT JOIN materials m ON a.product_id = m.id
         LEFT JOIN distributors d ON a.distributor_id = d.id
         ORDER BY a.created_at DESC`
      )
      .all();

    const data =
      result.results?.map((a: any) => {
        // 解析 photos JSON 数组
        let photos: string[] = [];
        try {
          photos = a.photos ? JSON.parse(a.photos) : [];
        } catch {
          photos = [];
        }
        return {
          id: a.id,
          productId: a.product_id,
          productName: a.product_name,
          projectId: a.project_id,
          // 优先用 JOIN 的名字，没有则用自定义文本
          projectName: a.project_name || a.project_name_text || null,
          distributorId: a.distributor_id,
          // 优先用 JOIN 的名字，没有则用自定义文本
          distributorName: a.distributor_name || a.distributor_name_text || null,
          type: a.type,
          content: a.content,
          status: a.status,
          result: a.result,
          remark: a.remark,
          photos,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        };
      }) || [];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("After-sales GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建售后记录
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { productId, projectId, projectName, distributorId, distributorName, type, content, remark } = body;

    if (!type || !content) {
      return NextResponse.json({ success: false, error: "类型和描述不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    // 如果有自定义名称（projectName/distributorName）且无对应ID，存到 text 字段
    const finalProjectId = projectId || null;
    const finalProjectNameText = (!projectId && projectName) ? projectName : null;
    const finalDistributorId = distributorId || null;
    const finalDistributorNameText = (!distributorId && distributorName) ? distributorName : null;

    // 禁用外键约束
    await db.prepare("PRAGMA foreign_keys = OFF").run();
    try {
      await db
        .prepare(
          `INSERT INTO after_sales (id, product_id, project_id, project_name_text, distributor_id, distributor_name_text, type, content, status, remark, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          productId || null,
          finalProjectId,
          finalProjectNameText || null,
          finalDistributorId,
          finalDistributorNameText || null,
          type,
          content,
          "待处理",
          remark || null,
          now,
          now
        )
        .run();
    } finally {
      await db.prepare("PRAGMA foreign_keys = ON").run();
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("After-sales POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新售后记录
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, status, result, photos } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "ID和状态不能为空" }, { status: 400 });
    }

    const now = Date.now();

    // 处理照片：转换为 JSON 字符串存储
    const photosJson = photos && photos.length > 0 ? JSON.stringify(photos) : null;

    if (status === "已完成" || photos !== undefined) {
      await db
        .prepare("UPDATE after_sales SET status = ?, result = ?, photos = ?, updated_at = ? WHERE id = ?")
        .bind(status, result || null, photosJson, now, id)
        .run();
    } else {
      await db
        .prepare("UPDATE after_sales SET status = ?, updated_at = ? WHERE id = ?")
        .bind(status, now, id)
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("After-sales PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除售后记录
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

    await db.prepare("DELETE FROM after_sales WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("After-sales DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
