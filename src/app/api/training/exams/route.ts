import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取考核题目 / 获取模块题数统计
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("moduleId");

    if (moduleId) {
      // 返回指定模块的题目，可选传入 recordId 获取用户答题详情
      const recordId = searchParams.get("recordId");
      
      // 如果有 recordId，获取用户的答题情况
      let userAnswers: Record<string, string | string[]> = {};
      if (recordId) {
        const recordResult = await db
          .prepare("SELECT answers FROM training_records WHERE id = ?")
          .bind(recordId)
          .first();
        if (recordResult?.answers) {
          try {
            userAnswers = JSON.parse(recordResult.answers as string);
          } catch {}
        }
      }

      const result = await db
        .prepare("SELECT * FROM training_exams WHERE module_id = ? ORDER BY created_at ASC")
        .bind(moduleId)
        .all();

      const exams =
        result.results?.map((e: any) => ({
          id: e.id,
          moduleId: e.module_id,
          questionType: e.question_type,
          question: e.question,
          options: e.options,
          answer: e.answer,
          score: e.score,
          createdAt: e.created_at,
          // 加入用户的答案
          userAnswer: userAnswers[e.id] || null,
        })) || [];

      return NextResponse.json({ success: true, data: exams });
    } else {
      // 返回各模块的题目数量统计
      const result = await db
        .prepare(`
          SELECT tm.id, tm.title, tm.category, tm.passing_score, tm.content,
                 COUNT(te.id) as examCount,
                 SUM(te.score) as totalScore
          FROM training_modules tm
          LEFT JOIN training_exams te ON tm.id = te.module_id
          GROUP BY tm.id
          ORDER BY tm.created_at DESC
        `)
        .all();

      return NextResponse.json({
        success: true,
        data:
          result.results?.map((r: any) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            passingScore: r.passing_score,
            content: r.content,
            examCount: r.examCount || 0,
            totalScore: r.totalScore || 0,
          })) || [],
      });
    }
  } catch (error) {
    console.error("Training exams GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建考核题目
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { moduleId, questionType, question, options, answer, score } = body;

    if (!moduleId || !question) {
      return NextResponse.json({ success: false, error: "缺少必填字段" }, { status: 400 });
    }

    // 问答题型不需要选项，选择题答案可选（自测题）
    const isQA = questionType === "qa";
    if (!isQA && !options) {
      return NextResponse.json({ success: false, error: "选择题需要填写选项" }, { status: 400 });
    }
    if (isQA && !answer) {
      return NextResponse.json({ success: false, error: "问答题目需要填写参考答案" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO training_exams (id, module_id, question_type, question, options, answer, score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        moduleId,
        questionType,
        question,
        isQA ? null : options,
        JSON.stringify(answer),
        isQA ? (score || 20) : (score || 10),
        now
      )
      .run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Training exams POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 编辑考核题目
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, question, options, answer, score, questionType } = body;

    if (!id || !question) {
      return NextResponse.json({ success: false, error: "缺少必填字段" }, { status: 400 });
    }

    const isQA = questionType === "qa";
    const finalOptions = isQA ? null : options;
    // 答案标准化：支持中英文逗号，转大写
    let answerParts: string[] = [];
    if (!isQA && answer) {
      // 可能是数组（页面新格式）或字符串（兼容旧格式）
      if (Array.isArray(answer)) {
        answerParts = (answer as string[]).map((a) => a.replace(/，/g, ",").trim().toUpperCase()).filter(Boolean);
      } else {
        // 字符串格式：支持 A,C / A C / A，C
        answerParts = String(answer).replace(/[，\s]+/g, ",").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      }
    }
    const finalAnswer = JSON.stringify(answerParts);

    await db
      .prepare(
        `UPDATE training_exams SET question = ?, options = ?, answer = ?, score = ?, question_type = ? WHERE id = ?`
      )
      .bind(question, finalOptions, finalAnswer, score || 10, questionType, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Training exams PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除考核题目
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
      return NextResponse.json({ success: false, error: "题目ID不能为空" }, { status: 400 });
    }

    // 获取moduleId用于更新计数
    const examInfo = await db.prepare("SELECT module_id FROM training_exams WHERE id = ?").bind(id).first();

    await db.prepare("DELETE FROM training_exams WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Training exams DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
