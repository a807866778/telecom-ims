"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface TrainingModule {
  id: string;
  title: string;
  category: string;
  content: string;
  videoUrl: string | null;
  externalLink: string | null;
  attachments: Attachment[];
  passingScore: number;
  createdAt: number;
  examCount?: number;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
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

export default function TrainingContentPage() {
  const router = useRouter();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editModule, setEditModule] = useState<TrainingModule | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "通用安全",
    content: "",
    videoUrl: "",
    externalLink: "",
    attachments: [] as Attachment[],
    passingScore: 80,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null); // module ID for exam management
  const [exams, setExams] = useState<TrainingExam[]>([]);
  const [userRole, setUserRole] = useState("user");

  // 获取当前用户角色
  useEffect(() => {
    const role = (window as any).__USER_ROLE__;
    if (role) {
      setUserRole(role);
    }
  }, []);

  const fetchModules = useCallback(async () => {
    const res = await fetch("/api/training/content");
    const data = await res.json();
    if (data.success) setModules(data.data);
  }, []);

  const fetchExams = async (moduleId: string) => {
    const res = await fetch(`/api/training/exams?moduleId=${moduleId}`);
    const data = await res.json();
    if (data.success) setExams(data.data);
  };

  useEffect(() => {
    fetchModules().then(() => setLoading(false));
  }, [fetchModules]);

  const resetForm = () => {
    setForm({ title: "", category: "通用安全", content: "", videoUrl: "", externalLink: "", attachments: [], passingScore: 80 });
    setEditModule(null);
    setShowAddForm(false);
  };

  // 上传附件
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
          const newAttachment: Attachment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
            name: file.name,
            url: data.url,
            type: file.type,
            size: file.size,
          };
          setForm((prev) => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
        } else {
          alert(data.error || "上传失败");
        }
      }
    } finally {
      setUploading(false);
    }
  };

  // 移除附件
  const handleRemoveAttachment = (attachmentId: string) => {
    setForm((prev) => ({ ...prev, attachments: prev.attachments.filter((a) => a.id !== attachmentId) }));
  };

  // 获取文件图标
  const getFileIcon = (type: string) => {
    if (type === "application/pdf") return "📄";
    if (type.includes("word")) return "📝";
    return "📎";
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const isEdit = !!editModule;
    const payload = isEdit ? { ...form, id: editModule.id } : form;
    const res = await fetch("/api/training/content", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      resetForm();
      await fetchModules();
    } else {
      setError(data.error);
    }
    setSaving(false);
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("确定删除该培训模块？关联的考核题目也将被删除。")) return;
    await fetch("/api/training/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchModules();
    if (activeTab === id) setActiveTab(null);
  };

  const openEdit = (mod: TrainingModule) => {
    setEditModule(mod);
    setForm({
      title: mod.title,
      category: mod.category,
      content: mod.content,
      videoUrl: mod.videoUrl || "",
      externalLink: mod.externalLink || "",
      attachments: mod.attachments || [],
      passingScore: mod.passingScore,
    });
    setShowAddForm(true);
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm("确定删除该题目？")) return;
    await fetch("/api/training/exams", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: examId }),
    });
    if (activeTab) {
      await fetchExams(activeTab);
      await fetchModules();
    }
  };

  const toggleExamPanel = (moduleId: string) => {
    if (activeTab === moduleId) {
      setActiveTab(null);
    } else {
      setActiveTab(moduleId);
      fetchExams(moduleId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === "admin";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">培训内容管理</h1>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 新建模块
          </button>
        )}
      </div>

      {/* 添加/编辑培训模块 */}
      {showAddForm && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">
              {editModule ? "编辑模块" : "新建培训模块"}
            </h2>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          <form onSubmit={handleModuleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="通用安全">通用安全</option>
                  <option value="光缆工程">光缆工程</option>
                  <option value="管道工程">管道工程</option>
                  <option value="电力工程">电力工程</option>
                  <option value="其他">其他</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">培训内容 *</label>
              <textarea
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="输入培训内容（支持纯文本）"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">视频链接</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📎 参考资料链接（可选）</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.externalLink}
                  onChange={(e) => setForm({ ...form, externalLink: e.target.value })}
                  placeholder="https://"
                />
                <p className="text-xs text-gray-400 mt-1">
                  用于添加培训相关的外部参考资料，如：国家标准文件PDF链接、产品手册网址、学习视频网址等。员工在培训内容页面可直接点击跳转查看。
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📎 附件上传（可选）</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="flex flex-wrap gap-3">
                    {form.attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <span>{getFileIcon(att.type)}</span>
                        <span className="text-sm text-gray-700 max-w-32 truncate">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100">
                      {uploading ? (
                        <span className="text-sm">上传中...</span>
                      ) : (
                        <>
                          <span>+</span>
                          <span className="text-sm">添加附件</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        multiple
                        onChange={handleUploadAttachment}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    支持 PDF、Word 文档（.pdf, .doc, .docx），员工在学习页面可查看/下载
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">及格分数</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.passingScore}
                  onChange={(e) => setForm({ ...form, passingScore: parseInt(e.target.value) || 80 })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 模块列表 */}
      <div className="space-y-3">
        {modules.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">暂无培训模块</div>
        ) : (
          modules.map((mod) => (
            <div key={mod.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        {mod.category}
                      </span>
                      <h3 className="font-medium text-gray-900">{mod.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{mod.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>及格分: {mod.passingScore}</span>
                      {(mod.videoUrl || mod.externalLink) && <span>含附件</span>}
                      <span>题目: {mod.examCount || 0}</span>
                      <span>{new Date(mod.createdAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleExamPanel(mod.id)}
                      className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      题库管理
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(mod)} className="text-blue-600 hover:text-blue-800 text-xs">
                          编辑
                        </button>
                        <button onClick={() => handleDeleteModule(mod.id)} className="text-red-600 hover:text-red-800 text-xs">
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 题库管理面板 */}
              {activeTab === mod.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-700">
                        考核题目 ({exams.length}) · 总分: {exams.reduce((sum, e) => sum + e.score, 0)} 分
                      </h4>
                      {exams.reduce((sum, e) => sum + e.score, 0) < 100 && (
                        <p className="text-xs text-orange-500 mt-0.5">
                          ⚠️ 总分需达到100分才能进行正式考核
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/training/questions/add?moduleId=${mod.id}`)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      + 添加题目
                    </button>
                  </div>

                  {exams.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">暂无题目</div>
                  ) : (
                    <div className="space-y-2">
                      {exams.map((exam) => {
                        const isQA = exam.questionType === "qa";
                        // 安全解析 options（问答题可能是纯文本）
                        let options: string[] = [];
                        if (!isQA && exam.options) {
                          try {
                            options = JSON.parse(exam.options);
                          } catch {
                            options = [];
                          }
                        }
                        // 安全解析 answers
                        let answers: string[] = [];
                        try {
                          answers = JSON.parse(exam.answer);
                        } catch {
                          answers = [];
                        }
                        return (
                          <div key={exam.id} className="card p-3 bg-white flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  isQA ? "bg-purple-100 text-purple-600" :
                                  exam.questionType === "multi" ? "bg-orange-100 text-orange-600" :
                                  "bg-gray-100 text-gray-600"
                                }`}>
                                  {isQA ? "问答" : exam.questionType === "multi" ? "多选" : "单选"}
                                </span>
                                <span className="text-xs text-gray-400">{exam.score}分</span>
                              </div>
                              <p className="text-sm text-gray-800">{exam.question}</p>
                              {isQA ? (
                                // 问答题显示参考答案
                                <p className="text-xs text-gray-500 mt-1">参考答案：{exam.answer}</p>
                              ) : (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {options.map((opt, idx) => {
                                    const letter = String.fromCharCode(65 + idx);
                                    return (
                                      <span
                                        key={idx}
                                        className={`px-2 py-0.5 rounded text-xs ${
                                          answers.includes(letter)
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        {letter}. {opt}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteExam(exam.id)}
                                className="text-red-400 hover:text-red-600 text-xs ml-3"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
