"use client";

import { useEffect, useState, useCallback } from "react";

interface ModuleExam {
  id: string;
  title: string;
  category: string;
  passingScore: number;
  content: string;
  examCount: number;
  totalScore: number;
}

interface ExamQuestion {
  id: string;
  moduleId: string;
  questionType: string;
  question: string;
  options: string | null;
  answer: string;
  score: number;
}

interface ModuleRecord {
  id: string;
  moduleId: string;
  score: number;
  passed: boolean;
  completedAt: number;
}

export default function TrainingExamPage() {
  const [modules, setModules] = useState<ModuleExam[]>([]);
  const [records, setRecords] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"exam" | "history">("exam");
  const [activeModule, setActiveModule] = useState<ModuleExam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; total: number } | null>(null);
  const [userName, setUserName] = useState("员工");

  useEffect(() => {
    const role = (window as any).__USER_ROLE__;
    const name = (window as any).__USER_NAME__;
    const userId = (window as any).__USER_ID__;
    if (name) setUserName(name);
    fetchData(userId);
  }, []);

  const fetchData = async (userId?: string) => {
    setLoading(true);
    const recordsUrl = userId ? `/api/training/records?userId=${encodeURIComponent(userId)}` : "/api/training/records";
    const [modulesRes, recordsRes] = await Promise.all([
      fetch("/api/training/exams"),
      fetch(recordsUrl),
    ]);
    const modulesData = await modulesRes.json();
    const recordsData = await recordsRes.json();
    if (modulesData.success) setModules(modulesData.data);
    if (recordsData.success) setRecords(recordsData.data);
    setLoading(false);
  };

  const startExam = async (mod: ModuleExam) => {
    if (mod.examCount === 0) {
      alert("该模块暂无考核题目，请联系管理员添加。");
      return;
    }
    if ((mod.totalScore || 0) < 100) {
      alert(`该模块题目总分仅 ${mod.totalScore} 分，需要至少 100 分才能参加正式考核。请联系管理员添加更多题目。`);
      return;
    }
    setActiveModule(mod);
    setLoadingQuestions(true);
    setAnswers({});
    setResult(null);

    const res = await fetch(`/api/training/exams?moduleId=${mod.id}`);
    const data = await res.json();
    if (data.success) {
      setQuestions(data.data);
    }
    setLoadingQuestions(false);
  };

  const handleAnswer = (questionId: string, value: string | string[], isMulti: boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const submitExam = async () => {
    if (!activeModule) return;

    const unanswered = questions.filter((q) => answers[q.id] === undefined).length;
    if (unanswered > 0 && !confirm(`还有 ${unanswered} 道题未答，确定要提交吗？`)) return;

    let earnedScore = 0;
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

    questions.forEach((q) => {
      const userAnswer = answers[q.id];
      if (userAnswer === undefined) return;

      let correct: string[] = [];
      try {
        correct = JSON.parse(q.answer || "[]");
      } catch {
        correct = [];
      }

      if (q.questionType === "qa") {
        const ua = (userAnswer as string).trim();
        if (ua.length >= 50) earnedScore += Math.round(q.score * 0.6);
      } else if (q.questionType === "multi") {
        const uaArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        // 标准化：把答案拆分成单个字母数组
        // 支持 ["A","B"] 或 ["AB"] 两种格式
        const normalizedCorrect: string[] = [];
        for (const c of correct) {
          normalizedCorrect.push(...c.split(""));
        }
        const normalizedUser: string[] = [];
        for (const u of uaArr) {
          normalizedUser.push(...u.split(""));
        }
        if (JSON.stringify([...normalizedUser].sort()) === JSON.stringify([...normalizedCorrect].sort())) {
          earnedScore += q.score;
        }
      } else {
        if (userAnswer === correct[0]) earnedScore += q.score;
      }
    });

    const score = totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0;
    const passed = score >= (activeModule.passingScore || 60);

    const userId = (window as any).__USER_ID__;

    setSubmitting(true);
    try {
      const res = await fetch("/api/training/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          moduleId: activeModule.id, 
          score, 
          passed, 
          userId: userId || `anon_${Date.now()}`,
          answers // 保存用户答题详情
        }),
      });
      const data = await res.json();
      if (!data.success) console.error("记录保存失败:", data.error);
    } catch (e) {
      console.error("提交失败:", e);
    }

    setResult({ score, passed, total: totalScore });
    setSubmitting(false);

    // 刷新记录列表
    const recordsUrl = userId ? `/api/training/records?userId=${encodeURIComponent(userId)}` : "/api/training/records";
    const recordsRes = await fetch(recordsUrl);
    const recordsData = await recordsRes.json();
    if (recordsData.success) setRecords(recordsData.data);
  };

  const getModuleRecord = (moduleId: string) => {
    return records
      .filter((r) => r.moduleId === moduleId)
      .sort((a, b) => b.completedAt - a.completedAt)[0];
  };

  const getTypeName = (type: string) => {
    if (type === "single") return "单选题";
    if (type === "multi") return "多选题";
    if (type === "judge") return "判断题";
    if (type === "qa") return "问答题";
    return type;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 h-32 animate-pulse bg-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">培训考核</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("exam")}
            className={`px-4 py-2 rounded-lg text-sm ${activeTab === "exam" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            参加考核
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-sm ${activeTab === "history" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            考核记录
          </button>
        </div>
      </div>

      {/* 答题模式 */}
      {activeTab === "exam" && !result && (
        <>
          {!activeModule ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.filter((m) => m.examCount > 0).length === 0 ? (
                <div className="col-span-2 card p-8 text-center text-gray-400">
                  当前暂无考核题目，请联系管理员添加。
                </div>
              ) : (
                modules
                  .filter((m) => m.examCount > 0)
                  .map((mod) => {
                    const record = getModuleRecord(mod.id);
                    return (
                      <div key={mod.id} className="card p-4 border border-gray-100 hover:border-blue-200 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                                {mod.category}
                              </span>
                              {record && (
                                <span className={`px-2 py-0.5 rounded text-xs ${record.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {record.passed ? "已通过" : "未通过"}
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-gray-900 mb-1">{mod.title}</h3>
                            <div className="flex gap-4 text-xs text-gray-400">
                              <span>题目: {mod.examCount}题</span>
                              <span>总分: {mod.totalScore}分</span>
                              <span>及格: {mod.passingScore}%</span>
                            </div>
                            {record && (
                              <div className="mt-2 text-xs text-gray-500">
                                最近成绩: <span className={record.passed ? "text-green-600" : "text-red-600"}>{record.score}分</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => startExam(mod)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 whitespace-nowrap"
                          >
                            {record ? "重新考核" : "参加考核"}
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 答题进度头部 */}
              <div className="card p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="font-semibold text-gray-900">{activeModule?.title}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      共 {questions.length} 题 · 满分 {activeModule?.totalScore} 分 · 及格线 {activeModule?.passingScore}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModule(null)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    返回列表
                  </button>
                </div>
              </div>

              {/* 题目列表 */}
              {loadingQuestions ? (
                <div className="card p-8 text-center text-gray-400">加载题目中...</div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    const isMulti = q.questionType === "multi";
                    const isQA = q.questionType === "qa";
                    const currentAnswer = answers[q.id];
                    
                    // 安全解析 options（问答题可能是纯文本）
                    let options: string[] = [];
                    if (!isQA && q.options) {
                      try {
                        options = JSON.parse(q.options);
                      } catch {
                        options = [];
                      }
                    }

                    return (
                      <div key={q.id} className="card p-5">
                        <div className="flex items-start gap-2 mb-3">
                          <span className="text-blue-600 font-semibold text-sm mt-0.5">{idx + 1}.</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${q.questionType === "qa" ? "bg-purple-100 text-purple-700" : q.questionType === "multi" ? "bg-orange-100 text-orange-700" : q.questionType === "judge" ? "bg-teal-100 text-teal-700" : "bg-blue-100 text-blue-700"}`}>
                                {getTypeName(q.questionType)}
                              </span>
                              <span className="text-xs text-gray-400">{q.score}分</span>
                              {isMulti && <span className="text-xs text-gray-400">（多选）</span>}
                            </div>
                            <p className="text-gray-800 font-medium">{q.question}</p>
                          </div>
                        </div>

                        {/* 选择题选项 */}
                        {q.questionType !== "qa" && (
                          <div className="space-y-2 ml-7">
                            {options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isSelected = isMulti
                                ? (Array.isArray(currentAnswer) && currentAnswer.includes(letter))
                                : currentAnswer === letter;

                              return (
                                <label
                                  key={optIdx}
                                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-100 hover:border-blue-200"}`}
                                >
                                  {isMulti ? (
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-blue-600"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const current = Array.isArray(currentAnswer) ? currentAnswer : [];
                                        if (e.target.checked) {
                                          handleAnswer(q.id, [...current, letter], true);
                                        } else {
                                          handleAnswer(q.id, current.filter((s) => s !== letter), true);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <input
                                      type="radio"
                                      name={`q-${q.id}`}
                                      className="w-4 h-4 accent-blue-600"
                                      checked={isSelected}
                                      onChange={() => handleAnswer(q.id, letter, false)}
                                    />
                                  )}
                                  <span className={`text-sm font-medium ${isSelected ? "text-blue-700" : "text-gray-600"}`}>
                                    {letter}. {opt}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* 问答题 */}
                        {q.questionType === "qa" && (
                          <div className="ml-7 mt-2">
                            <textarea
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              rows={4}
                              placeholder="请输入您的回答..."
                              value={(currentAnswer as string) || ""}
                              onChange={(e) => handleAnswer(q.id, e.target.value, false)}
                            />
                            <p className="text-xs text-gray-400 mt-1">参考答案将在提交后显示</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 提交按钮 */}
              {!loadingQuestions && questions.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  {Object.keys(answers).length === 0 && (
                    <p className="text-xs text-gray-400">请先选择答案后再提交</p>
                  )}
                  <button
                    type="button"
                    onClick={submitExam}
                    disabled={submitting || Object.keys(answers).length === 0}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
                  >
                    {submitting ? "提交中..." : "提交答卷"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 结果展示 */}
      {result && (
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">{result.passed ? "🎉" : "😔"}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {result.passed ? "考核通过！" : "未通过考核"}
          </h2>
          <p className="text-gray-500 mb-2">
            您的得分：<span className={`text-3xl font-bold ${result.passed ? "text-green-600" : "text-red-600"}`}>{result.score}</span> 分（及格线 {activeModule?.passingScore}%）
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => {
                setResult(null);
                setActiveModule(null);
                setAnswers({});
                setActiveTab("history");
              }}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              查看考核记录
            </button>
            {!result.passed && activeModule && (
              <button
                onClick={() => startExam(activeModule)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                重新考核
              </button>
            )}
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {activeTab === "history" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">培训模块</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">分类</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">成绩</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">结果</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    暂无考核记录
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const mod = modules.find((m) => m.id === rec.moduleId);
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{mod?.title || "未知模块"}</td>
                      <td className="px-4 py-3 text-gray-500">{mod?.category || "-"}</td>
                      <td className="px-4 py-3 font-semibold">{rec.score}分</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${rec.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {rec.passed ? "通过" : "未通过"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(rec.completedAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
