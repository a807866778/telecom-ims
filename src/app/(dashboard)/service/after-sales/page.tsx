"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface AfterSale {
  id: string;
  productId: string | null;
  productName: string | null;
  projectId: string | null;
  projectName: string | null;
  distributorId: string | null;
  distributorName: string | null;
  type: string;
  content: string;
  status: string;
  result: string | null;
  remark: string | null;
  photos: string[];
  createdAt: number;
  updatedAt: number;
}

interface Project {
  id: string;
  name: string;
}

interface Distributor {
  id: string;
  name: string;
}

export default function AfterSalesPage() {
  const [items, setItems] = useState<AfterSale[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [useCustomProject, setUseCustomProject] = useState(false);
  const [useCustomDistributor, setUseCustomDistributor] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    projectName: "",
    distributorId: "",
    distributorName: "",
    type: "退换货",
    content: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [editItem, setEditItem] = useState<AfterSale | null>(null);
  const [resolveItem, setResolveItem] = useState<AfterSale | null>(null);
  const [viewResultItem, setViewResultItem] = useState<AfterSale | null>(null);
  const [viewPhotosItem, setViewPhotosItem] = useState<{ photos: string[] } | null>(null);
  const [resolvePhotos, setResolvePhotos] = useState<string[]>([]);
  const [resolveResult, setResolveResult] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const [itemsRes, projectsRes, distributorsRes] = await Promise.all([
      fetch("/api/service/after-sales"),
      fetch("/api/projects"),
      fetch("/api/archive/distributors"),
    ]);
    const itemsData = await itemsRes.json();
    const projectsData = await projectsRes.json();
    const distributorsData = await distributorsRes.json();
    if (itemsData.success) setItems(itemsData.data);
    if (projectsData.success) setProjects(projectsData.data);
    if (distributorsData.success) setDistributors(distributorsData.data);
  }, []);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const resetForm = () => {
    setForm({ projectId: "", projectName: "", distributorId: "", distributorName: "", type: "退换货", content: "" });
    setUseCustomProject(false);
    setUseCustomDistributor(false);
    setEditItem(null);
    setShowAddForm(false);
    setResolveItem(null);
    setResolvePhotos([]);
    setResolveResult("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      projectId: useCustomProject ? null : form.projectId,
      projectName: useCustomProject ? form.projectName : (projects.find(p => p.id === form.projectId)?.name || ""),
      distributorId: useCustomDistributor ? null : form.distributorId,
      distributorName: useCustomDistributor ? form.distributorName : (distributors.find(d => d.id === form.distributorId)?.name || ""),
      type: form.type,
      content: form.content,
    };

    const res = await fetch("/api/service/after-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      resetForm();
      await fetchData();
    } else {
      setError(data.error);
    }
    setSaving(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/service/after-sales", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "操作失败"); return; }
      await fetchData();
      setResolveItem(null);
      setResolvePhotos([]);
      setResolveResult("");
    } catch (e) {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该售后记录？")) return;
    await fetch("/api/service/after-sales", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
  };

  // 上传照片到 R2
  const uploadToR2 = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "上传失败");
    return data.url;
  };

  // 提交前将 base64 data URI 转成 R2 URL（兼容老数据）
  const convertPhotosToR2 = async (photos: string[]): Promise<string[]> => {
    const results: string[] = [];
    for (const photo of photos) {
      if (photo.startsWith("data:")) {
        try {
          const matches = photo.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches) { results.push(photo); continue; }
          const [, mime, base64Data] = matches;
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });
          const f = new File([blob], "photo.jpg", { type: mime });
          const url = await uploadToR2(f);
          results.push(url);
        } catch { results.push(photo); }
      } else {
        results.push(photo);
      }
    }
    return results;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadToR2(file);
        setResolvePhotos((prev) => [...prev, url]);
      }
    } catch (err: any) {
      setError(err.message || "上传失败");
    } finally {
      setUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setResolvePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResolve = async () => {
    if (!resolveItem) return;
    setSaving(true);
    setError("");
    try {
      // 提交前把 base64 老照片转成 R2 URL
      const photosToSave = await convertPhotosToR2(resolvePhotos);
      const res = await fetch("/api/service/after-sales", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resolveItem.id,
          status: "已完成",
          result: resolveResult,
          photos: photosToSave,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "操作失败"); return; }
      await fetchData();
      setResolveItem(null);
      setResolvePhotos([]);
      setResolveResult("");
    } catch (e) {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter((i) => filterStatus === "all" || i.status === filterStatus);

  const typeColor = (type: string) => {
    switch (type) {
      case "退换货": return "bg-orange-100 text-orange-700";
      case "维修": return "bg-blue-100 text-blue-700";
      case "保养": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "待处理": return "bg-yellow-100 text-yellow-700";
      case "处理中": return "bg-blue-100 text-blue-700";
      case "已完成": return "bg-green-100 text-green-700";
      case "已关闭": return "bg-gray-100 text-gray-500";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4"><div className="animate-pulse space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded"></div>)}</div></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">设备售后</h1>
        <button onClick={() => { resetForm(); setShowAddForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 新建工单
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "待处理", "处理中", "已完成", "已关闭"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 text-sm rounded-lg ${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s === "all" ? "全部" : s}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">待处理</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{items.filter((i) => i.status === "待处理").length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">处理中</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{items.filter((i) => i.status === "处理中").length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">已完成</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{items.filter((i) => i.status === "已完成").length}</div>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">新建售后工单</h2>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              {/* 项目名称：下拉框 + 自由输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联项目</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="useCustomProject"
                    checked={useCustomProject}
                    onChange={(e) => {
                      setUseCustomProject(e.target.checked);
                      if (!e.target.checked) setForm({ ...form, projectName: "" });
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="useCustomProject" className="text-sm text-gray-600">手动输入项目名称</label>
                </div>
                {useCustomProject ? (
                  <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="输入项目名称" />
                ) : (
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                    <option value="">-- 选择项目 --</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>

              {/* 客户：下拉框 + 自由输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">客户</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="useCustomDistributor"
                    checked={useCustomDistributor}
                    onChange={(e) => {
                      setUseCustomDistributor(e.target.checked);
                      if (!e.target.checked) setForm({ ...form, distributorName: "" });
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="useCustomDistributor" className="text-sm text-gray-600">手动输入客户</label>
                </div>
                {useCustomDistributor ? (
                  <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.distributorName} onChange={(e) => setForm({ ...form, distributorName: e.target.value })} placeholder="输入客户名称" />
                ) : (
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.distributorId} onChange={(e) => setForm({ ...form, distributorId: e.target.value })}>
                    <option value="">-- 选择客户 --</option>
                    {distributors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="退换货">退换货</option>
                  <option value="维修">维修</option>
                  <option value="保养">保养</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">问题描述 *</label>
              <textarea required rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "保存中..." : "提交"}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">取消</button>
            </div>
          </form>
        </div>
      )}

      {/* Resolve modal */}
      {resolveItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { if (!saving) { setResolveItem(null); setError(""); setResolvePhotos([]); setResolveResult(""); } }}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 mb-4">处理售后工单</h2>
            <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">{resolveItem.content}</p>
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-3">{error}</div>}
            {resolveItem.photos && resolveItem.photos.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">已上传照片：</div>
                <div className="flex flex-wrap gap-2">
                  {resolveItem.photos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`照片${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 新增照片上传 */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">添加处理照片：</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
              >
                {uploading ? "上传中..." : "+ 添加照片"}
              </button>
              {resolvePhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {resolvePhotos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`新照片${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border border-blue-200" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <textarea rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4" placeholder="填写处理结果..." value={resolveResult} onChange={(e) => setResolveResult(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" onClick={handleResolve} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? "保存中..." : "标记完成"}
              </button>
              <button type="button" onClick={() => handleUpdateStatus(resolveItem.id, "处理中")} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "保存中..." : "标记处理中"}
              </button>
              <button type="button" onClick={() => { setResolveItem(null); setResolvePhotos([]); setResolveResult(""); setError(""); }} disabled={saving} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-50">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="card p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${typeColor(item.type)}`}>{item.type}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColor(item.status)}`}>{item.status}</span>
                  {item.projectName && <span className="text-sm font-medium text-gray-700">{item.projectName}</span>}
                </div>
                <p className="text-sm text-gray-600 mb-1">{item.content}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {item.distributorName && <span>客户: {item.distributorName}</span>}
                  <span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span>
                  {item.result && <span className="text-green-600">✓ 已处理</span>}
                  {item.photos.length > 0 && <span className="text-blue-600">📷 {item.photos.length}张</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {item.result && (
                  <button onClick={() => setViewResultItem(item)} className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                    查看结果
                  </button>
                )}
                {item.photos.length > 0 && (
                  <button onClick={() => setViewPhotosItem({ photos: item.photos })} className="px-3 py-1 text-xs text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50">
                    查看照片
                  </button>
                )}
                {item.status !== "已完成" && item.status !== "已关闭" && (
                  <button onClick={() => { setResolveItem(item); setResolveResult(item.result || ""); setResolvePhotos(item.photos || []); }} className="px-3 py-1 text-xs text-green-600 border border-green-200 rounded-lg hover:bg-green-50">
                    {item.result ? "查看/编辑处理" : "处理"}
                  </button>
                )}
                {item.status === "已完成" && (
                  <button onClick={() => handleUpdateStatus(item.id, "已关闭")} className="px-3 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                    关闭
                  </button>
                )}
                <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 text-xs">删除</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="card p-8 text-center text-gray-400">暂无售后记录</div>}
      </div>

      {/* 查看结果弹窗 */}
      {viewResultItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewResultItem(null)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">处理结果</h2>
              <button onClick={() => setViewResultItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-sm text-green-800 whitespace-pre-wrap">{viewResultItem.result}</div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setViewResultItem(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 查看照片弹窗 */}
      {viewPhotosItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setViewPhotosItem(null)}>
          <div className="max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">照片（{viewPhotosItem.photos.length}张）</h2>
              <button onClick={() => setViewPhotosItem(null)} className="text-white text-2xl hover:text-gray-300">×</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto">
              {viewPhotosItem.photos.map((photo, idx) => (
                <img
                  key={idx}
                  src={photo}
                  alt={`照片${idx + 1}`}
                  className="w-full object-contain rounded-lg cursor-pointer hover:opacity-90"
                  onClick={() => window.open(photo, "_blank")}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
