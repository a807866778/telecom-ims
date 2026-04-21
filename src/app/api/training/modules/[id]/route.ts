import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取单个培训模块详情
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

    const result = await db.prepare("SELECT * FROM training_modules WHERE id = ?").bind(id).first();

    if (!result) {
      return NextResponse.json({ success: false, error: "培训模块不存在" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        title: result.title,
        category: result.category,
        content: result.content,
        videoUrl: result.video_url,
        externalLink: result.external_link,
        passingScore: result.passing_score,
        examCount: result.exam_count || 0,
        attachments: result.attachments ? JSON.parse(result.attachments) : [],
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      }
    });
  } catch (error) {
    console.error("Get training module error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
