"use client";

import { useEffect, useState } from "react";

// 解析视频 URL，返回 embed src
function getVideoEmbedSrc(url: string): { type: "youtube" | "video" | "iframe"; src: string } | null {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return { type: "youtube", src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1` };
  }
  // Bilibili
  const blMatch = url.match(/bilibili\.com\/video\/([a-zA-Z0-9]+)/);
  if (blMatch) {
    return { type: "iframe", src: `https://player.bilibili.com/player.html?bvid=${blMatch[1]}&autoplay=1` };
  }
  // 直接视频文件（mp4/webm/ogg）
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return { type: "video", src: url };
  }
  // 其他 → iframe
  return { type: "iframe", src: url };
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface TrainingModule {
  id: string;
  title: string;
  category: string;
  content: string;
  videoUrl: string | null;
  externalLink: string | null;
  attachments: Attachment[];
  passingScore: number;
}

interface AddForm {
  title: string;
  category: string;
  content: string;
  videoUrl: string;
  externalLink: string;
  attachments: Attachment[];
  passingScore: number;
}

export default function TrainingLearnPage() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editModule, setEditModule] = useState<TrainingModule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<AddForm>({
    title: "",
    category: "安全规程",
    content: "",
    videoUrl: "",
    externalLink: "",
    attachments: [],
    passingScore: 80,
  });

  useEffect(() => {
    // 检查管理员权限
    const checkRole = () => {
      const role = (window as any).__USER_ROLE__;
      if (role === "admin") {
        setIsAdmin(true);
      }
    };
    checkRole();
    // 延迟再检查一次，防止时序问题
    const timer = setTimeout(checkRole, 500);

    fetch("/api/training/content")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setModules(data.data);
        setLoading(false);
      });

    return () => clearTimeout(timer);
  }, []);

  // 也监听 auth/me 接口获取角色
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.role === "admin") {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  const fetchModules = () => {
    fetch("/api/training/content")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setModules(data.data);
      });
  };

  const resetForm = () => {
    setForm({ title: "", category: "安全规程", content: "", videoUrl: "", externalLink: "", attachments: [], passingScore: 80 });
    setEditModule(null);
    setShowAddModal(false);
    setError("");
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
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const method = editModule ? "PUT" : "POST";
    const payload: any = {
      title: form.title,
      category: form.category,
      content: form.content,
      videoUrl: form.videoUrl || null,
      externalLink: form.externalLink || null,
      attachments: form.attachments,
      passingScore: form.passingScore,
    };
    if (editModule) payload.id = editModule.id;

    const res = await fetch("/api/training/content", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      resetForm();
      fetchModules();
    } else {
      setError(data.error || "保存失败");
    }
    setSaving(false);
  };

  // 上传附件
  const [uploading, setUploading] = useState(false);

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.success) {
          const newAtt: Attachment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
            name: file.name,
            url: data.url,
            type: file.type,
            size: file.size,
          };
          setForm((prev) => ({ ...prev, attachments: [...prev.attachments, newAtt] }));
        } else {
          alert(data.error || "上传失败");
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setForm((prev) => ({ ...prev, attachments: prev.attachments.filter((a) => a.id !== attId) }));
  };

  const getFileIcon = (type: string) => {
    if (type === "application/pdf") return "📄";
    if (type.includes("word")) return "📝";
    return "📎";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该培训内容？")) return;
    const res = await fetch("/api/training/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) {
      fetchModules();
      if (selectedModule?.id === id) setSelectedModule(null);
    } else {
      alert(data.error || "删除失败");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-100 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedModule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedModule(null)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
          >
            ← 返回列表
          </button>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  openEdit(selectedModule);
                  setSelectedModule(null);
                }}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(selectedModule.id)}
                className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
              >
                删除
              </button>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
              {selectedModule.category}
            </span>
            <h1 className="text-xl font-semibold text-gray-900">{selectedModule.title}</h1>
          </div>

          {/* Video */}
          {selectedModule.videoUrl && (() => {
            const video = getVideoEmbedSrc(selectedModule.videoUrl);
            return (
              <div className="mb-6">
                <h2 className="font-medium text-gray-700 mb-2">培训视频</h2>
                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                  {video?.type === "youtube" && (
                    <iframe
                      className="w-full h-full"
                      src={video.src}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                  {video?.type === "video" && (
                    <video className="w-full h-full" controls autoPlay>
                      <source src={video.src} />
                      <p className="text-white text-center py-8">您的浏览器不支持视频播放。</p>
                    </video>
                  )}
                  {video?.type === "iframe" && (
                    <iframe
                      className="w-full h-full"
                      src={video.src}
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            );
          })()}

          {/* External link - open in new tab */}
          {selectedModule.externalLink && (() => {
            const url = selectedModule.externalLink;
            const isPdf = /\.pdf(\?|$)/i.test(url);
            return (
              <div className="mb-6">
                <h2 className="font-medium text-gray-700 mb-2">外部学习资料</h2>
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <span className="text-2xl">{isPdf ? "📄" : "🔗"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {isPdf ? "PDF 文档" : "外部链接"}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-md">{url}</p>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    {isPdf ? "查看/下载" : "前往查看"}
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Attachments */}
          {selectedModule.attachments && selectedModule.attachments.length > 0 && (() => {
            return (
              <div className="mb-6">
                <h2 className="font-medium text-gray-700 mb-2">培训附件</h2>
                <div className="space-y-2">
                  {selectedModule.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <span className="text-2xl">{getFileIcon(att.type)}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{att.name}</p>
                        <p className="text-xs text-gray-500">
                          {att.size > 1024 * 1024
                            ? `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                            : `${(att.size / 1024).toFixed(1)} KB`}
                        </p>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                      >
                        查看/下载
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Content */}
          <div className="mb-6">
            <h2 className="font-medium text-gray-700 mb-2">培训内容</h2>
            <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-700">
              {selectedModule.content}
            </div>
          </div>

          {/* Start exam button */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">及格分: {selectedModule.passingScore}</span>
            <a
              href={`/training/exam?moduleId=${selectedModule.id}`}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              开始考核
            </a>
          </div>
        </div>
      </div>
    );
  }

  // List view
  const categories = [...new Set(modules.map((m) => m.category))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">在线学习</h1>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加培训内容
          </button>
        )}
      </div>

      {/* 添加/编辑模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editModule ? "编辑培训内容" : "添加培训内容"}
              </h2>
              <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="请输入培训内容标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="如：安全规程、操作规范"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">培训内容 *</label>
                <textarea
                  required
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="请输入培训内容详情..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">视频链接（选填）</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">外部链接（选填）</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.externalLink}
                  onChange={(e) => setForm({ ...form, externalLink: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">附件上传（选填）</label>
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
                    支持 PDF、Word 文档（.pdf, .doc, .docx）
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">及格分数</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.passingScore}
                  onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="text-sm font-medium text-gray-500 mb-3">{cat}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {modules
              .filter((m) => m.category === cat)
              .map((mod) => (
                <div
                  key={mod.id}
                  className="card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setSelectedModule(mod)}
                    >
                      <h3 className="font-medium text-gray-900 mb-1">{mod.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{mod.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {mod.videoUrl && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-600">
                            📹 含视频
                          </span>
                        )}
                        {mod.externalLink && (
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600">
                            🔗 外部链接
                          </span>
                        )}
                        {mod.attachments && mod.attachments.length > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-green-50 text-green-600">
                            📎 {mod.attachments.length}个附件
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(mod); }}
                            className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-50"
                          >
                            编辑
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(mod.id); }}
                            className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                          >
                            删除
                          </button>
                        </>
                      )}
                      <span
                        className="text-gray-300 cursor-pointer"
                        onClick={() => setSelectedModule(mod)}
                      >→</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {modules.length === 0 && (
        <div className="card p-8 text-center">
          <div className="text-gray-400 mb-4">暂无培训内容</div>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              + 添加第一条培训内容
            </button>
          )}
        </div>
      )}
    </div>
  );
}
