import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有培训模块
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db
      .prepare(
        `SELECT m.*, 
                (SELECT COUNT(*) FROM training_exams WHERE module_id = m.id) as exam_count 
         FROM training_modules m 
         ORDER BY m.created_at DESC`
      )
      .all();

    const modules =
      result.results?.map((m: any) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        content: m.content,
        videoUrl: m.video_url,
        externalLink: m.external_link,
        attachments: m.attachments ? JSON.parse(m.attachments) : [],
        passingScore: m.passing_score,
        createdAt: m.created_at,
        examCount: (m as any).exam_count,
      })) || [];

    return NextResponse.json({ success: true, data: modules });
  } catch (error) {
    console.error("Training content GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建培训模块
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { title, category, content, videoUrl, externalLink, attachments, passingScore } = body;

    if (!title || !category || !content) {
      return NextResponse.json({ success: false, error: "标题、分类和内容不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const attachmentsJson = attachments ? JSON.stringify(attachments) : null;

    await db
      .prepare(
        `INSERT INTO training_modules (id, title, category, content, video_url, external_link, attachments, passing_score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, title, category, content, videoUrl || null, externalLink || null, attachmentsJson, passingScore || 80, now)
      .run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Training content POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新培训模块
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, title, category, content, videoUrl, externalLink, attachments, passingScore } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "模块ID不能为空" }, { status: 400 });
    }

    const attachmentsJson = attachments ? JSON.stringify(attachments) : null;
    await db
      .prepare(
        `UPDATE training_modules SET title = ?, category = ?, content = ?, video_url = ?, external_link = ?, attachments = ?, passing_score = ? WHERE id = ?`
      )
      .bind(title, category, content, videoUrl || null, externalLink || null, attachmentsJson, passingScore || 80, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Training content PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除培训模块
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
      return NextResponse.json({ success: false, error: "模块ID不能为空" }, { status: 400 });
    }

    await db.prepare("DELETE FROM training_exams WHERE module_id = ?").bind(id).run();
    await db.prepare("DELETE FROM training_records WHERE module_id = ?").bind(id).run();
    await db.prepare("DELETE FROM training_modules WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Training content DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
