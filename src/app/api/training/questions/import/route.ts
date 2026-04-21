import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Excel导入API - POST
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { moduleId, questions, clearExisting } = body;

    console.log("导入请求:", { moduleId, questionsCount: questions?.length, clearExisting });

    if (!moduleId || !questions || !Array.isArray(questions)) {
      console.log("缺少参数:", { moduleId: !!moduleId, questions: !!questions, isArray: Array.isArray(questions) });
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 如果需要清除原题库
    if (clearExisting) {
      try {
        await db.prepare("DELETE FROM training_exams WHERE module_id = ?").bind(moduleId).run();
      } catch (err) {
        console.error("清除原题库失败", err);
      }
    }

    let importedCount = 0;
    let errors: string[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // 验证必填字段
      if (!q.question || !q.questionType) {
        console.log(`第${i + 1}行验证失败:`, { question: q.question, questionType: q.questionType });
        errors.push(`第${i + 1}行：缺少题目内容或题目类型`);
        continue;
      }

      // 处理选择题选项
      let options: string[] = [];
      let answerStr = q.answer || "";
      
      if (q.questionType !== "qa") {
        // 判断题：固定选项
        if (q.questionType === "judge") {
          options = ["正确", "错误"];
        } else {
          // 选择题：收集非空的选项
          options = [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean);
        }
        
        // 标准化答案（支持逗号分隔的多选）
        answerStr = (q.answer || "")
          .replace(/，/g, ",")
          .replace(/\s+/g, "")
          .toUpperCase();
      }

      // 默认分值
      const score = parseInt(String(q.score)) || 10;

      try {
        const id = crypto.randomUUID();
        console.log(`插入第${i + 1}题:`, { id, moduleId, questionType: q.questionType, question: q.question?.substring(0, 20), score });
        
        await db.prepare(`
          INSERT INTO training_exams (id, module_id, question_type, question, options, answer, score, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          moduleId,
          q.questionType,
          q.question,
          // 问答题传空数组，其他传选项JSON
          q.questionType === "qa" ? "[]" : JSON.stringify(options),
          q.questionType === "qa" ? q.answer : JSON.stringify(answerStr.split(",").filter(Boolean)),
          score,
          Date.now()
        ).run();
        
        importedCount++;
      } catch (err: any) {
        console.log(`第${i + 1}行插入失败:`, err.message);
        errors.push(`第${i + 1}行：${err.message || "导入失败"}`);
      }
    }

    // 同时更新模块的exam_count（如果表有这个字段）
    try {
      const countResult = await db
        .prepare("SELECT COUNT(*) as count FROM training_exams WHERE module_id = ?")
        .bind(moduleId)
        .first();
      
      const examCount = countResult?.count || 0;
      
      // 尝试更新 exam_count（如果字段不存在会忽略错误）
      try {
        await db
          .prepare("UPDATE training_modules SET exam_count = ? WHERE id = ?")
          .bind(examCount, moduleId)
          .run();
      } catch {
        // 忽略 exam_count 不存在的错误
      }
    } catch (err) {
      console.error("更新模块exam_count失败", err);
    }

    return NextResponse.json({
      success: true,
      importedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `成功导入 ${importedCount} 道题目`
    });

  } catch (err: any) {
    console.error("导入题库失败", err);
    return NextResponse.json(
      { success: false, error: err.message || "导入失败" },
      { status: 500 }
    );
  }
}
