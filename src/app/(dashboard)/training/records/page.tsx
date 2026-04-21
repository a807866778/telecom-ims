"use client";

import { useEffect, useState, useCallback } from "react";

interface TrainingRecord {
  id: string;
  userId: string;
  userName: string;
  moduleId: string;
  moduleTitle: string;
  moduleCategory: string;
  passingScore: number;
  score: number;
  passed: boolean;
  completedAt: number;
}

interface Question {
  id: string;
  questionType: string;
  question: string;
  options: string;
  answer: string;
  score: number;
  createdAt?: number;
  userAnswer?: string | string[]; // 用户答案
}

export default function TrainingRecordsPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "passed" | "failed">("all");
  const [userRole, setUserRole] = useState("user");
  
  // 详情弹窗状态
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [detailQuestions, setDetailQuestions] = useState<Question[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const role = (window as any).__USER_ROLE__;
    if (role) setUserRole(role);
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const res = await fetch("/api/training/records");
    const data = await res.json();
    if (data.success) setRecords(data.data);
    setLoading(false);
  };

  // 查看详情
  const handleViewDetail = async (record: TrainingRecord) => {
    setSelectedRecord(record);
    setLoadingDetail(true);
    try {
      // 传入 recordId 以获取用户的答题详情
      const res = await fetch(`/api/training/exams?moduleId=${record.moduleId}&recordId=${record.id}`);
      const data = await res.json();
      if (data.success) {
        setDetailQuestions(data.data);
      }
    } catch (err) {
      console.error("获取题目失败:", err);
    }
    setLoadingDetail(false);
  };

  // 获取题型名称
  const getTypeName = (type: string) => {
    if (type === "single") return "单选题";
    if (type === "multi") return "多选题";
    if (type === "judge") return "判断题";
    if (type === "qa") return "问答题";
    return type;
  };

  // 解析答案显示
  const parseAnswer = (answer: string, questionType: string, options: string) => {
    if (questionType === "qa") return answer;
    try {
      const optArr = JSON.parse(options) as string[];
      const ansArr = JSON.parse(answer) as string[];
      return ansArr.map((a) => {
        const idx = a.charCodeAt(0) - 65;
        return `${a}. ${optArr[idx] || a}`;
      }).join("、");
    } catch {
      return answer;
    }
  };

  const filteredRecords = records.filter((r) => {
    if (filter === "passed") return r.passed;
    if (filter === "failed") return !r.passed;
    return true;
  });

  // 按人员分组统计
  const statsByPerson = records.reduce((acc, r) => {
    if (!acc[r.userId]) {
      acc[r.userId] = { name: r.userName, total: 0, passed: 0, failed: 0 };
    }
    acc[r.userId].total++;
    if (r.passed) acc[r.userId].passed++;
    else acc[r.userId].failed++;
    return acc;
  }, {} as Record<string, { name: string; total: number; passed: number; failed: number }>);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">培训记录</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            全部 ({records.length})
          </button>
          <button
            onClick={() => setFilter("passed")}
            className={`px-4 py-2 rounded-lg text-sm ${filter === "passed" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            通过 ({records.filter((r) => r.passed).length})
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`px-4 py-2 rounded-lg text-sm ${filter === "failed" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            未通过 ({records.filter((r) => !r.passed).length})
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {userRole === "admin" && Object.keys(statsByPerson).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(statsByPerson).map(([uid, stat]) => (
            <div key={uid} className="card p-4">
              <div className="text-sm text-gray-500 mb-1">{stat.name || "未知员工"}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{stat.passed}/{stat.total}</span>
                <span className="text-xs text-gray-400">参与次数</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                通过率 {stat.total > 0 ? Math.round((stat.passed / stat.total) * 100) : 0}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 记录列表 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {userRole === "admin" && <th className="text-left px-4 py-3 text-gray-600 font-medium">员工</th>}
              <th className="text-left px-4 py-3 text-gray-600 font-medium">培训模块</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">分类</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">成绩</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">及格分</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">结果</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">考核时间</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  {filter === "all" ? "暂无培训记录" : `暂无${filter === "passed" ? "通过" : "未通过"}记录`}
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  {userRole === "admin" && (
                    <td className="px-4 py-3 text-gray-800">{rec.userName || "未知"}</td>
                  )}
                  <td className="px-4 py-3 text-gray-800">{rec.moduleTitle || "未知模块"}</td>
                  <td className="px-4 py-3 text-gray-500">{rec.moduleCategory || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${rec.score >= rec.passingScore ? "text-green-600" : "text-red-600"}`}>
                      {rec.score}分
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{rec.passingScore}分</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${rec.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {rec.passed ? "通过" : "未通过"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(rec.completedAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDetail(rec)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 详情弹窗 */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedRecord.moduleTitle}</h3>
                <p className="text-sm text-gray-500">
                  成绩：{selectedRecord.score}分（{selectedRecord.passed ? "通过" : "未通过"}）
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : (
                <div className="space-y-4">
                  {detailQuestions.map((q, idx) => {
                    // 判断是否答对
                    const isQA = q.questionType === "qa";
                    let isCorrect = false;
                    let userAnswerDisplay = "未答";
                    let earnedScore = 0;
                    
                    if (!isQA && q.userAnswer !== undefined && q.userAnswer !== null) {
                      // 选择题判断
                      try {
                        const correctAnswers = JSON.parse(q.answer || "[]");
                        const ua = q.userAnswer;
                        if (q.questionType === "multi") {
                          const uaArr = Array.isArray(ua) ? ua : [ua];
                          // 标准化：把答案拆分成单个字母数组
                          const normalizedCorrect: string[] = [];
                          for (const c of correctAnswers) {
                            normalizedCorrect.push(...c.split(""));
                          }
                          const normalizedUser: string[] = [];
                          for (const u of uaArr) {
                            normalizedUser.push(...u.split(""));
                          }
                          isCorrect = JSON.stringify([...normalizedUser].sort()) === JSON.stringify([...normalizedCorrect].sort());
                        } else {
                          isCorrect = ua === correctAnswers[0];
                        }
                        // 格式化用户答案显示
                        if (Array.isArray(ua)) {
                          userAnswerDisplay = ua.join(", ");
                        } else {
                          userAnswerDisplay = String(ua);
                        }
                        earnedScore = isCorrect ? q.score : 0;
                      } catch {
                        userAnswerDisplay = "解析错误";
                      }
                    }
                    
                    return (
                      <div key={q.id} className={`border rounded-lg p-4 ${isCorrect ? "bg-green-50 border-green-200" : isQA ? "bg-gray-50" : "bg-red-50 border-red-200"}`}>
                        <div className="flex items-start gap-2 mb-2">
                          <span className={`font-semibold text-sm ${isCorrect ? "text-green-600" : isQA ? "text-gray-600" : "text-red-600"}`}>{idx + 1}.</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                isQA ? "bg-purple-100 text-purple-700" :
                                q.questionType === "multi" ? "bg-orange-100 text-orange-700" :
                                q.questionType === "judge" ? "bg-teal-100 text-teal-700" :
                                "bg-blue-100 text-blue-700"
                              }`}>
                                {getTypeName(q.questionType)}
                              </span>
                              <span className="text-xs text-gray-400">满分 {q.score} 分</span>
                              {!isQA && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}>
                                  {isCorrect ? "✓ 正确" : "✗ 错误"}
                                </span>
                              )}
                              {!isQA && (
                                <span className={`text-sm font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                                  +{earnedScore}分
                                </span>
                              )}
                            </div>
                            <p className="font-medium">{q.question}</p>
                          </div>
                        </div>
                        
                        {/* 选项显示（问答题显示参考要点） */}
                        <div className="ml-7 space-y-1 text-sm text-gray-600">
                          {isQA ? (
                            // 问答题显示参考要点
                            <div className="text-gray-600 whitespace-pre-wrap">{q.options}</div>
                          ) : (
                            // 选择题显示选项列表，高亮用户选择的答案
                            (() => {
                              try {
                                const opts = JSON.parse(q.options) as string[];
                                let correctAnswers: string[] = [];
                                try { correctAnswers = JSON.parse(q.answer || "[]"); } catch {}
                                const userAnswer = q.userAnswer;
                                const rawUserArr = Array.isArray(userAnswer) ? userAnswer : (userAnswer ? [userAnswer] : []);
                                // 标准化用户答案：拆分成单个字母
                                const userAnswerArr: string[] = [];
                                for (const u of rawUserArr) {
                                  userAnswerArr.push(...u.split(""));
                                }
                                // 标准化正确答案
                                const normalizedCorrect: string[] = [];
                                for (const c of correctAnswers) {
                                  normalizedCorrect.push(...c.split(""));
                                }
                                
                                return opts.map((opt, i) => {
                                  const letter = String.fromCharCode(65 + i);
                                  const isCorrectOption = normalizedCorrect.includes(letter);
                                  const isUserSelected = userAnswerArr.includes(letter);
                                  
                                  return (
                                    <div key={i} className={`flex items-start gap-2 p-1 rounded ${isUserSelected ? (isCorrectOption ? "bg-green-100" : "bg-red-100") : ""}`}>
                                      <span className={`font-medium ${isCorrectOption ? "text-green-600" : ""}`}>{letter}.</span>
                                      <span className={isCorrectOption ? "text-green-700 font-medium" : ""}>{opt}</span>
                                      {isCorrectOption && <span className="text-green-600 text-xs ml-1">✓</span>}
                                      {isUserSelected && !isCorrectOption && <span className="text-red-600 text-xs ml-1">✗</span>}
                                    </div>
                                  );
                                });
                              } catch {
                                return <div className="text-gray-500">{q.options}</div>;
                              }
                            })()
                          )}
                        </div>
                        
                        {/* 答案对比 */}
                        <div className="ml-7 mt-3 pt-3 border-t border-gray-200">
                          {!isQA && (
                            <p className="text-sm">
                              <span className="text-gray-500">你的答案：</span>
                              <span className={`font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                                {userAnswerDisplay}
                              </span>
                            </p>
                          )}
                          <p className="text-sm mt-1">
                            <span className="text-green-600 font-medium">正确答案：</span>
                            <span className="text-gray-700">
                              {isQA ? "（问答题需人工批改）" : parseAnswer(q.answer, q.questionType, q.options)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
