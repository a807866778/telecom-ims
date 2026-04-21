import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取考核记录（显示全部记录，含匿名）
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId"); // 可选筛选

    let query = `
      SELECT tr.*, u.real_name, tm.title as module_title, tm.category as module_category, tm.passing_score
       FROM training_records tr
       LEFT JOIN users u ON tr.user_id = u.id
       LEFT JOIN training_modules tm ON tr.module_id = tm.id
    `;
    if (userId) {
      query += " WHERE tr.user_id = ?";
    }
    query += " ORDER BY tr.completed_at DESC";

    const stmt = userId
      ? db.prepare(query).bind(userId)
      : db.prepare(query);
    const result = await stmt.all();

    const records =
      result.results?.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.real_name || "匿名用户",
        moduleId: r.module_id,
        moduleTitle: r.module_title || "未知模块",
        moduleCategory: r.module_category || "-",
        passingScore: r.passing_score || 80,
        score: r.score,
        passed: r.passed === 1,
        completedAt: r.completed_at,
        // 解析用户答题详情
        answers: r.answers ? JSON.parse(r.answers) : null,
      })) || [];

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Training records GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 保存考核记录
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { moduleId, score, passed, userId: clientUserId, answers } = body;

    if (!moduleId) {
      return NextResponse.json({ success: false, error: "模块ID不能为空" }, { status: 400 });
    }

    // 优先使用客户端传入的 userId，否则为 NULL（匿名用户）
    const finalUserId = clientUserId || null;
    const id = crypto.randomUUID();
    const now = Date.now();
    // 保存用户答题详情
    const answersJson = answers ? JSON.stringify(answers) : null;

    await db
      .prepare(
        `INSERT INTO training_records (id, user_id, module_id, score, passed, completed_at, answers)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, finalUserId, moduleId, score, passed ? 1 : 0, now, answersJson)
      .run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Training records POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
