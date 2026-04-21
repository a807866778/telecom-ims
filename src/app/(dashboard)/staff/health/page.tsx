"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useUpload } from "@/components/UploadButton";

interface StaffMember {
  id: string;
  name: string;
  status?: string;
}

interface HealthRecord {
  id: string;
  staffId: string;
  staffName: string;
  healthCertNo: string | null;
  healthCertExpiry: number | null;
  checkupDate: number | null;
  checkupReportUrl: string | null;
  remark: string | null;
  createdAt: number;
}

function HealthContent() {
  const searchParams = useSearchParams();
  const staffId = searchParams.get("staffId");

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState(staffId || "");
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<HealthRecord | null>(null);
  const [form, setForm] = useState({
    healthCertNo: "",
    healthCertExpiry: "",
    checkupDate: "",
    checkupReportUrl: "",
    remark: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewRecord, setViewRecord] = useState<HealthRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, handleFileChange } = useUpload();

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/staff/list");
    const data = await res.json();
    if (data.success) setStaff(data.data.filter((s: StaffMember) => s.status === "在职"));
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!selectedStaffId) { setRecords([]); return; }
    const res = await fetch(`/api/staff/health?staffId=${selectedStaffId}`);
    const data = await res.json();
    if (data.success) setRecords(data.data);
  }, [selectedStaffId]);

  useEffect(() => {
    fetchStaff().then(() => setLoading(false));
  }, [fetchStaff]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const resetForm = () => {
    setForm({ healthCertNo: "", healthCertExpiry: "", checkupDate: "", checkupReportUrl: "", remark: "" });
    setEditItem(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: any = {
      staffId: selectedStaffId,
      healthCertNo: form.healthCertNo || null,
      healthCertExpiry: form.healthCertExpiry ? new Date(form.healthCertExpiry).getTime() : null,
      checkupDate: form.checkupDate ? new Date(form.checkupDate).getTime() : null,
      checkupReportUrl: form.checkupReportUrl || null,
      remark: form.remark || null,
    };

    const isEdit = !!editItem;
    const res = await fetch("/api/staff/health", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { ...payload, id: editItem.id } : payload),
    });

    const data = await res.json();
    if (data.success) {
      resetForm();
      await fetchRecords();
    } else {
      setError(data.error);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该健康档案？")) return;
    await fetch("/api/staff/health", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchRecords();
  };

  const openEdit = (item: HealthRecord) => {
    setEditItem(item);
    setForm({
      healthCertNo: item.healthCertNo || "",
      healthCertExpiry: item.healthCertExpiry ? new Date(item.healthCertExpiry).toISOString().slice(0, 10) : "",
      checkupDate: item.checkupDate ? new Date(item.checkupDate).toISOString().slice(0, 10) : "",
      checkupReportUrl: item.checkupReportUrl || "",
      remark: item.remark || "",
    });
    setShowAddForm(true);
  };

  const isExpiringSoon = (ts: number | null) => {
    if (!ts) return false;
    const days = (ts - Date.now()) / (1000 * 60 * 60 * 24);
    return days < 30;
  };

  const isExpired = (ts: number | null) => {
    if (!ts) return false;
    return Date.now() > ts;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4"><div className="animate-pulse space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded"></div>)}</div></div>
      </div>
    );
  }

  const currentStaff = staff.find((s) => s.id === selectedStaffId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">健康档案</h1>

      {/* Staff selector */}
      <div className="card p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">选择人员</label>
        <select
          className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg"
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
        >
          <option value="">请选择人员</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStaffId && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="font-medium text-gray-700">{currentStaff?.name} 的健康档案</h2>
            <button onClick={() => { resetForm(); setShowAddForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              + 添加记录
            </button>
          </div>

          {/* Form */}
          {showAddForm && (
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">{editItem ? "编辑" : "添加"}健康档案</h3>
                <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">健康证号</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.healthCertNo} onChange={(e) => setForm({ ...form, healthCertNo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">健康证有效期</label>
                    <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.healthCertExpiry} onChange={(e) => setForm({ ...form, healthCertExpiry: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">查体日期</label>
                    <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.checkupDate} onChange={(e) => setForm({ ...form, checkupDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">查体报告链接</label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {uploading ? (
                          <span className="text-sm">上传中...</span>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>上传报告</span>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange(e, []).then((files) => {
                            if (files.length > 0) setForm({ ...form, checkupReportUrl: files[files.length - 1].url });
                          })}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                      {form.checkupReportUrl && (
                        <a href={form.checkupReportUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">查看已上传</a>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">取消</button>
                </div>
              </form>
            </div>
          )}

          {/* Records */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left">健康证号</th>
                    <th className="px-4 py-3 text-left">有效期</th>
                    <th className="px-4 py-3 text-left">查体日期</th>
                    <th className="px-4 py-3 text-left">备注</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">{r.healthCertNo || "-"}</td>
                      <td className="px-4 py-3">
                        {r.healthCertExpiry ? (
                          <span className={isExpired(r.healthCertExpiry) ? "text-red-600 font-medium" : isExpiringSoon(r.healthCertExpiry) ? "text-orange-600" : "text-gray-500"}>
                            {new Date(r.healthCertExpiry).toLocaleDateString("zh-CN")}
                            {isExpired(r.healthCertExpiry) && " (已过期)"}
                            {isExpiringSoon(r.healthCertExpiry) && !isExpired(r.healthCertExpiry) && " (即将到期)"}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{r.checkupDate ? new Date(r.checkupDate).toLocaleDateString("zh-CN") : "-"}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{r.remark || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (r.checkupReportUrl) {
                                window.open(r.checkupReportUrl, "_blank");
                              } else {
                                alert("该档案暂未上传查体报告附件");
                              }
                            }}
                            className={`text-xs ${r.checkupReportUrl ? "text-green-600 hover:text-green-800" : "text-gray-400 cursor-pointer"}`}
                          >
                            查看报告
                          </button>
                          <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 text-xs">编辑</button>
                          <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-800 text-xs">删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length === 0 && <div className="p-8 text-center text-gray-400">暂无健康档案</div>}
            </div>
          </div>
        </>
      )}

      {/* 照片预览弹窗 */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
            >
              ✕
            </button>
            <img
              src={previewUrl}
              alt="健康报告"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* 健康档案详情弹窗 */}
      {viewRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewRecord(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">健康档案详情</h2>
              <button onClick={() => setViewRecord(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">健康证号</span>
                <span className="font-mono">{viewRecord.healthCertNo || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">有效期</span>
                <span className={isExpired(viewRecord.healthCertExpiry) ? "text-red-600 font-medium" : isExpiringSoon(viewRecord.healthCertExpiry) ? "text-orange-600" : ""}>
                  {viewRecord.healthCertExpiry ? new Date(viewRecord.healthCertExpiry).toLocaleDateString("zh-CN") : "-"}
                  {isExpired(viewRecord.healthCertExpiry) && " (已过期)"}
                  {isExpiringSoon(viewRecord.healthCertExpiry) && !isExpired(viewRecord.healthCertExpiry) && " (即将到期)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">查体日期</span>
                <span>{viewRecord.checkupDate ? new Date(viewRecord.checkupDate).toLocaleDateString("zh-CN") : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">查体报告</span>
                <span>
                  {viewRecord.checkupReportUrl ? (
                    <button onClick={() => { setViewRecord(null); setPreviewUrl(viewRecord.checkupReportUrl); }} className="text-blue-600 hover:underline">点击查看报告</button>
                  ) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">备注</span>
                <span className="text-right max-w-[60%]">{viewRecord.remark || "-"}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => { setViewRecord(null); openEdit(viewRecord); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                编辑
              </button>
              <button
                onClick={() => setViewRecord(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HealthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">加载中...</div>}>
      <HealthContent />
    </Suspense>
  );
}
