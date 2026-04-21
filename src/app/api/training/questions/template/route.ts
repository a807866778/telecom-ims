import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const XLSX = await import("xlsx");

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 题目数据（分值用数字类型）
    const questionData = [
      { "题目内容": "以下哪项是正确的？", "题型": "单选", "选项A": "选项A内容", "选项B": "选项B内容", "选项C": "选项C内容", "选项D": "选项D内容", "正确答案": "A", "分值": 5 },
      { "题目内容": "以下哪些选项是正确的？", "题型": "多选", "选项A": "选项A内容", "选项B": "选项B内容", "选项C": "选项C内容", "选项D": "选项D内容", "正确答案": "AB", "分值": 10 },
      { "题目内容": "以下说法是否正确？", "题型": "判断", "选项A": "正确", "选项B": "错误", "选项C": "", "选项D": "", "正确答案": "A", "分值": 5 },
      { "题目内容": "请简述本培训的核心内容。", "题型": "问答", "选项A": "", "选项B": "", "选项C": "", "选项D": "", "正确答案": "参考要点", "分值": 20 },
    ];

    const wsQuestions = XLSX.utils.json_to_sheet(questionData);

    // 手动设置分值列为数字格式（XLSX默认会把数字转成文本）
    const range = XLSX.utils.decode_range(wsQuestions['!ref'] || 'A1');
    const scoreColIdx = 7; // 分值列索引（H列）
    for (let row = 1; row <= range.e.r; row++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: scoreColIdx });
      if (wsQuestions[cellRef]) {
        wsQuestions[cellRef].t = 'n'; // 设为数字类型
      }
    }

    // 设置列宽
    wsQuestions['!cols'] = [
      { wch: 30 }, // 题目内容
      { wch: 8 },  // 题型
      { wch: 12 }, // 选项A
      { wch: 12 }, // 选项B
      { wch: 12 }, // 选项C
      { wch: 12 }, // 选项D
      { wch: 12 }, // 正确答案
      { wch: 8 },  // 分值
    ];

    XLSX.utils.book_append_sheet(wb, wsQuestions, "题库模板");

    // 填写说明
    const instructionData = [
      { "项目": "题目内容", "说明": "题目的完整内容" },
      { "项目": "题型", "说明": "填写：单选 / 多选 / 判断 / 问答" },
      { "项目": "选项A-D", "说明": "选择题填写选项内容，判断题填'正确''错误'" },
      { "项目": "正确答案", "说明": "单选/判断：填字母(A/B)；多选：填多个字母(如AB)；问答：填参考答案" },
      { "项目": "分值", "说明": "该题的分值，建议总分为100分" },
    ];

    const wsInstruction = XLSX.utils.json_to_sheet(instructionData);
    wsInstruction['!cols'] = [{ wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsInstruction, "填写说明");

    // 生成 Excel 文件
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename*=UTF-8''题库模板.xlsx"
      }
    });
  } catch (error) {
    console.error("生成模板失败:", error);
    return NextResponse.json(
      { success: false, error: "生成模板失败" },
      { status: 500 }
    );
  }
}
