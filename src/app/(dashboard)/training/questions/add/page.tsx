"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

interface TrainingModule {
  id: string;
  title: string;
  category: string;
  content: string;
  videoUrl: string | null;
  externalLink: string | null;
  passingScore: number;
  examCount?: number;
}

interface TrainingExam {
  id: string;
  moduleId: string;
  questionType: string;
  question: string;
  options: string;
  answer: string;
  score: number;
}

interface ImportedQuestion {
  question: string;
  questionType: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  answer?: string;
  score?: number;
}

export default function AddQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("moduleId");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [exams, setExams] = useState<TrainingExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportedQuestion[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [clearExisting, setClearExisting] = useState(false); // 是否清除原题库
  
  const [examForm, setExamForm] = useState({
    questionType: "single",
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answer: "",
    score: 10,
  });
  const [confirmStep, setConfirmStep] = useState<1 | 2 | null>(null);

  useEffect(() => {
    if (moduleId) {
      fetchModuleAndExams();
    }
  }, [moduleId]);

  const fetchModuleAndExams = async () => {
    try {
      const [modRes, examRes] = await Promise.all([
        fetch(`/api/training/modules/${moduleId}`),
        fetch(`/api/training/exams?moduleId=${moduleId}`)
      ]);
      
      const modData = await modRes.json();
      const examData = await examRes.json();
      
      if (modData.success) setModule(modData.data);
      if (examData.success) setExams(examData.data);
    } catch (err) {
      console.error("获取数据失败", err);
    } finally {
      setLoading(false);
    }
  };

  const currentTotalScore = exams.reduce((sum, e) => sum + e.score, 0);
  const newTotalScore = currentTotalScore + examForm.score;

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleId) return;

    // 第一步：确认添加题目
    if (confirmStep === 1 || confirmStep === null) {
      const isQA = examForm.questionType === "qa";
      const typeName = isQA ? "问答题" : examForm.questionType === "multi" ? "多选题" : "单选题";
      const previewMsg = `确认添加这道${typeName}吗？
题目：${examForm.question.substring(0, 50)}${examForm.question.length > 50 ? "..." : ""}
分值：${examForm.score}分`;

      if (!confirm(previewMsg)) {
        return;
      }
      setConfirmStep(2);
      return;
    }

    // 第二步：确认提交题库（检查总分）
    if (confirmStep === 2) {
      if (newTotalScore < 100) {
        if (!confirm(`⚠️ 题库总分仅 ${newTotalScore} 分，未满100分！
员工无法参加正式考核，是否确认添加本题？
（添加后总分：${newTotalScore} 分）`)) {
          setConfirmStep(null);
          return;
        }
      } else {
        if (!confirm(`确认提交题库吗？
当前题目总分将变为：${newTotalScore} 分`)) {
          setConfirmStep(null);
          return;
        }
      }

      // 实际提交
      const isQA = examForm.questionType === "qa";

      const res = await fetch("/api/training/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          questionType: examForm.questionType,
          question: examForm.question,
          options: isQA ? null : JSON.stringify([
            examForm.optionA,
            examForm.optionB,
            examForm.optionC,
            examForm.optionD
          ].filter(Boolean)),
          answer: examForm.answer,
          score: isQA ? (examForm.score || 20) : examForm.score,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("题目添加成功！");
        router.back();
      } else {
        alert(data.error || "添加失败");
        setConfirmStep(null);
      }
    }
  };

  // 处理Excel文件导入
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert("请选择 Excel 文件（.xlsx 或 .xls）");
      return;
    }

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 方式1：使用 header: 1 获取原始数组格式
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // 调试日志
      console.log("原始数据行数:", rawData.length);
      console.log("表头行:", rawData[0]);

      if (rawData.length < 2) {
        alert("Excel文件为空或格式不正确");
        setImporting(false);
        return;
      }

      // 解析表头
      const headerRow = rawData[0].map((h: any) => String(h ?? "").trim());
      console.log("解析后表头:", headerRow);

      // 映射列索引
      const colMap: Record<string, number> = {};
      headerRow.forEach((h: string, idx: number) => {
        const lowerH = h.toLowerCase();
        if (lowerH.includes("题目") || lowerH.includes("题干") || lowerH.includes("内容")) {
          colMap.question = idx;
        } else if (lowerH.includes("题型") || lowerH.includes("类型")) {
          colMap.questionType = idx;
        } else if ((lowerH.includes("选项") && lowerH.includes("a")) || lowerH === "a") {
          colMap.optionA = idx;
        } else if ((lowerH.includes("选项") && lowerH.includes("b")) || lowerH === "b") {
          colMap.optionB = idx;
        } else if ((lowerH.includes("选项") && lowerH.includes("c")) || lowerH === "c") {
          colMap.optionC = idx;
        } else if ((lowerH.includes("选项") && lowerH.includes("d")) || lowerH === "d") {
          colMap.optionD = idx;
        } else if (lowerH.includes("答案") || lowerH === "answer") {
          colMap.answer = idx;
        } else if (lowerH.includes("分") || lowerH === "score" || lowerH.includes("分数")) {
          colMap.score = idx;
        }
      });
      
      console.log("列映射:", colMap);

      // 解析每行数据
      const questions: ImportedQuestion[] = [];
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        
        // 确保 row 是数组
        if (!Array.isArray(row)) continue;
        
        const question = String(row[colMap.question] ?? "").trim();
        if (!question) continue;

        // 解析题型
        let questionType = "single";
        const typeStr = String(row[colMap.questionType] ?? "单选").toLowerCase();
        if (typeStr.includes("多选")) {
          questionType = "multi";
        } else if (typeStr.includes("判断") || typeStr.includes("是非")) {
          questionType = "judge";
        } else if (typeStr.includes("问答") || typeStr.includes("论述")) {
          questionType = "qa";
        }

        // 解析答案
        let answer = String(row[colMap.answer] ?? "").trim();

        // 解析选项
        let optionA = String(row[colMap.optionA] ?? "").trim();
        let optionB = String(row[colMap.optionB] ?? "").trim();
        let optionC = String(row[colMap.optionC] ?? "").trim();
        let optionD = String(row[colMap.optionD] ?? "").trim();

        // 判断题特殊处理
        if (questionType === "judge") {
          optionA = "正确";
          optionB = "错误";
          optionC = "";
          optionD = "";
          // 判断题答案标准化
          const normalizedAnswer = answer.replace(/[对错是否]/g, "").trim().toUpperCase();
          if (normalizedAnswer === "正确" || normalizedAnswer === "A" || normalizedAnswer === "对" || normalizedAnswer === "TRUE" || normalizedAnswer === "YES" || normalizedAnswer === "1") {
            answer = "A";
          } else {
            answer = "B";
          }
        }

        // 解析分值（可能是数字或字符串）
        const scoreRaw = row[colMap.score];
        const score = parseInt(String(scoreRaw)) || 10;

        questions.push({
          question,
          questionType,
          optionA,
          optionB,
          optionC,
          optionD,
          answer,
          score,
        });
      }
      
      console.log("解析到题目数量:", questions.length);
      console.log("第一道题:", questions[0]);

      if (questions.length === 0) {
        alert("未能从Excel中解析出有效题目，请检查文件格式");
        setImporting(false);
        return;
      }

      setImportPreview(questions);
      setShowImportModal(true);
    } catch (err) {
      console.error("解析Excel失败", err);
      alert("解析Excel文件失败：" + (err as Error).message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 确认导入题库
  const confirmImport = async () => {
    console.log("confirmImport 调用:", { moduleId, importPreviewLength: importPreview.length });
    if (!moduleId || importPreview.length === 0) {
      console.log("提前退出:", { moduleId: !!moduleId, importPreviewEmpty: importPreview.length === 0 });
      return;
    }

    // 确认提示
    const confirmMsg = clearExisting 
      ? `⚠️ 确定要清除原题库并导入 ${importPreview.length} 道新题目吗？\n\n此操作将删除该模块下的所有原有题目，无法撤销！`
      : `确定要导入 ${importPreview.length} 道题目吗？\n\n（当前题库有 ${exams.length} 道题目，导入后将累加）`;
    
    if (!confirm(confirmMsg)) return;

    setSaving(true);
    try {
      console.log("开始发送导入请求...");
      const res = await fetch("/api/training/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          questions: importPreview,
          clearExisting,
        }),
      });
      console.log("收到响应:", res.status);

      const data = await res.json();
      console.log("响应数据:", data);
      
      if (data.success) {
        if (data.errors && data.errors.length > 0) {
          console.log("错误列表:", data.errors);
          alert(`部分题目导入失败！\n成功: ${data.importedCount} 道\n失败: ${data.errors.length} 道\n\n错误详情:\n${data.errors.slice(0, 5).join('\n')}${data.errors.length > 5 ? '\n...' : ''}`);
        } else {
          alert(`成功导入 ${data.importedCount} 道题目！`);
        }
        setShowImportModal(false);
        setImportPreview([]);
        setClearExisting(false);
        // 刷新题库列表
        await fetchModuleAndExams();
      } else {
        alert(data.error || "导入失败");
      }
    } catch (err) {
      console.error("导入请求失败:", err);
      alert("导入失败：" + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setExamForm({
      questionType: "single",
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      answer: "",
      score: 10,
    });
    setConfirmStep(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">未找到培训模块</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 返回按钮和标题 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">添加考核题目</h1>
          <p className="text-sm text-gray-500 mt-1">
            培训模块：{module.title}
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/training/questions/template"
            download="题库模板.xlsx"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下载模板
          </a>
          <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {importing ? "解析中..." : "导入Excel"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileImport}
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {/* 当前题库状态 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-blue-900">当前题库状态</h3>
            <p className="text-sm text-blue-700 mt-1">
              已添加 {exams.length} 道题目，当前总分 {currentTotalScore} 分
            </p>
          </div>
          {newTotalScore >= 100 ? (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
              ✓ 已达100分
            </span>
          ) : (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
              还差 {100 - newTotalScore} 分
            </span>
          )}
        </div>
      </div>

      {/* 添加题目表单 */}
      <form onSubmit={handleExamSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">题目信息</h2>

        {/* 题目类型 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">题目类型</label>
          <div className="flex gap-4">
            {[
              { value: "single", label: "单选题" },
              { value: "multi", label: "多选题" },
              { value: "qa", label: "问答题" },
            ].map((type) => (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="questionType"
                  value={type.value}
                  checked={examForm.questionType === type.value}
                  onChange={(e) => setExamForm({ ...examForm, questionType: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 题目内容 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            题目内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={examForm.question}
            onChange={(e) => setExamForm({ ...examForm, question: e.target.value })}
            placeholder="输入题目内容"
          />
        </div>

        {/* 选项区域（选择题） */}
        {examForm.questionType !== "qa" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选项 <span className="text-xs text-gray-400">（留空则不显示该选项）</span>
            </label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: "optionA", label: "A" },
                { key: "optionB", label: "B" },
                { key: "optionC", label: "C" },
                { key: "optionD", label: "D" },
              ].map((opt) => (
                <div key={opt.key} className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                    {opt.label}
                  </span>
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                    value={examForm[opt.key as keyof typeof examForm]}
                    onChange={(e) => setExamForm({ ...examForm, [opt.key]: e.target.value })}
                    placeholder={`选项${opt.label}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 答案 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            答案 <span className="text-red-500">*</span>
            {examForm.questionType === "single" && (
              <span className="text-xs text-gray-400 ml-2">（输入选项字母，如：A）</span>
            )}
            {examForm.questionType === "multi" && (
              <span className="text-xs text-gray-400 ml-2">（多选用逗号分隔，如：A,B）</span>
            )}
            {examForm.questionType === "qa" && (
              <span className="text-xs text-gray-400 ml-2">（问答题输入参考答案）</span>
            )}
          </label>
          {examForm.questionType === "qa" ? (
            <textarea
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              value={examForm.answer}
              onChange={(e) => setExamForm({ ...examForm, answer: e.target.value })}
              placeholder="输入参考答案（学员答题后的标准答案）"
            />
          ) : (
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              value={examForm.answer}
              onChange={(e) => setExamForm({ ...examForm, answer: e.target.value.toUpperCase() })}
              placeholder={examForm.questionType === "multi" ? "A,B,C" : "A"}
            />
          )}
        </div>

        {/* 分值 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            分值 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              required
              min="1"
              max="100"
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg"
              value={examForm.score}
              onChange={(e) => setExamForm({ ...examForm, score: parseInt(e.target.value) || 0 })}
            />
            <span className="text-sm text-gray-500">分</span>
            <span className="text-sm text-gray-400 ml-4">
              添加后总分：{newTotalScore} 分
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            重置
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2 rounded-lg text-white ${
                confirmStep === 2 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {saving ? "提交中..." : confirmStep === 2 ? "确认提交题库" : "下一步"}
            </button>
          </div>
        </div>

        {/* 确认步骤提示 */}
        {confirmStep === 2 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {newTotalScore < 100 ? (
              <>
                <p className="font-medium">⚠️ 题库总分未达100分</p>
                <p className="mt-1">员工无法参加正式考核。点击"确认提交题库"强行添加，或点击"重置"修改后重新添加。</p>
              </>
            ) : (
              <p>✓ 题库总分已达100分。点击"确认提交题库"完成添加。</p>
            )}
          </div>
        )}
      </form>

      {/* 导入预览模态框 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">导入预览</h2>
                <p className="text-sm text-gray-500 mt-1">
                  共识别 {importPreview.length} 道题目，预估总分 {importPreview.reduce((sum, q) => sum + (q.score || 10), 0)} 分
                </p>
              </div>
              <button
                onClick={() => { setShowImportModal(false); setImportPreview([]); }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* 清除选项 */}
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                    className="mt-1 w-4 h-4 text-amber-600 rounded"
                  />
                  <div>
                    <span className="font-medium text-amber-800">清除原题库</span>
                    <p className="text-sm text-amber-700 mt-0.5">
                      勾选后，导入前将删除该模块下的所有原有题目（当前 {exams.length} 道）
                    </p>
                  </div>
                </label>
              </div>

              <div className="space-y-3">
                {importPreview.map((q, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {q.questionType === "single" ? "单选" : q.questionType === "multi" ? "多选" : q.questionType === "judge" ? "判断" : "问答"}
                      </span>
                      <span className="text-xs text-gray-500">{q.score || 10}分</span>
                    </div>
                    <p className="text-sm text-gray-800 mb-2">{q.question}</p>
                    {q.questionType !== "qa" && (
                      <div className="flex flex-wrap gap-2">
                        {["A", "B", "C", "D"].map(opt => {
                          const val = q[`option${opt}` as keyof ImportedQuestion];
                          if (!val) return null;
                          const isAnswer = q.answer?.toUpperCase().includes(opt);
                          return (
                            <span
                              key={opt}
                              className={`px-2 py-1 text-xs rounded ${
                                isAnswer ? "bg-green-100 text-green-700" : "bg-white text-gray-600 border border-gray-200"
                              }`}
                            >
                              {opt}. {val}
                              {isAnswer && " ✓"}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {q.questionType === "qa" && q.answer && (
                      <p className="text-xs text-gray-500 mt-1">参考答案：{q.answer}</p>
                    )}
                  </div>
                ))}
              </div>
              
              {/* 总分不足提示 */}
              {currentTotalScore + importPreview.reduce((sum, q) => sum + (q.score || 10), 0) < 100 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                  ⚠️ 导入后总分仍不足100分，员工将无法参加正式考核。建议增加更多题目。
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportPreview([]); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={confirmImport}
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "导入中..." : `确认导入 ${importPreview.length} 道题目`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
