"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useUpload } from "@/components/UploadButton";

interface StaffMember {
  id: string;
  name: string;
}

interface LicenseRecord {
  id: string;
  staffId: string;
  staffName: string;
  licenseType: string;
  licenseNo: string | null;
  issueDate: number | null;
  expiryDate: number | null;
  licenseUrl: string | null;
  remark: string | null;
  createdAt: number;
}

function LicensesContent() {
  const searchParams = useSearchParams();
  const staffId = searchParams.get("staffId");

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState(staffId || "");
  const [records, setRecords] = useState<LicenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<LicenseRecord | null>(null);
  const [form, setForm] = useState({
    licenseType: "",
    licenseNo: "",
    issueDate: "",
    expiryDate: "",
    licenseUrl: "",
    remark: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, handleFileChange } = useUpload();

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/staff/list");
    const data = await res.json();
    if (data.success) setStaff(data.data);
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!selectedStaffId) { setRecords([]); return; }
    const res = await fetch(`/api/staff/licenses?staffId=${selectedStaffId}`);
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
    setForm({ licenseType: "", licenseNo: "", issueDate: "", expiryDate: "", licenseUrl: "", remark: "" });
    setEditItem(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: any = {
      staffId: selectedStaffId,
      licenseType: form.licenseType,
      licenseNo: form.licenseNo || null,
      issueDate: form.issueDate ? new Date(form.issueDate).getTime() : null,
      expiryDate: form.expiryDate ? new Date(form.expiryDate).getTime() : null,
      licenseUrl: form.licenseUrl || null,
      remark: form.remark || null,
    };

    const isEdit = !!editItem;
    const res = await fetch("/api/staff/licenses", {
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
    if (!confirm("确定删除该证照？")) return;
    await fetch("/api/staff/licenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchRecords();
  };

  const openEdit = (item: LicenseRecord) => {
    setEditItem(item);
    setForm({
      licenseType: item.licenseType,
      licenseNo: item.licenseNo || "",
      issueDate: item.issueDate ? new Date(item.issueDate).toISOString().slice(0, 10) : "",
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "",
      licenseUrl: item.licenseUrl || "",
      remark: item.remark || "",
    });
    setShowAddForm(true);
  };

  if (loading) {
    return <div className="space-y-4"><div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div></div>;
  }

  const currentStaff = staff.find((s) => s.id === selectedStaffId);
  const isExpired = (ts: number | null) => ts ? Date.now() > ts : false;
  const isExpiringSoon = (ts: number | null) => ts ? (ts - Date.now()) / (1000 * 60 * 60 * 24) < 30 : false;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">证照档案</h1>

      <div className="card p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">选择人员</label>
        <select className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
          <option value="">请选择人员</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {selectedStaffId && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="font-medium text-gray-700">{currentStaff?.name} 的证照</h2>
            <button onClick={() => { resetForm(); setShowAddForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              + 添加证照
            </button>
          </div>

          {showAddForm && (
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">{editItem ? "编辑" : "添加"}证照</h3>
                <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">证照类型 *</label>
                    <select required className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })}>
                      <option value="">选择类型</option>
                      <option value="作业证">作业证</option>
                      <option value="电工证">电工证</option>
                      <option value="焊工证">焊工证</option>
                      <option value="登高证">登高证</option>
                      <option value="安全员证">安全员证</option>
                      <option value="建造师证">建造师证</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">证号</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">发证日期</label>
                    <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">有效期至</label>
                    <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">证照图片</label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {uploading ? (
                          <span className="text-sm">上传中...</span>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>上传证照</span>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, []).then((files) => {
                            if (files.length > 0) setForm({ ...form, licenseUrl: files[files.length - 1].url });
                          })}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                      {form.licenseUrl && (
                        <a href={form.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">查看已上传</a>
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

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left">证照类型</th>
                    <th className="px-4 py-3 text-left">证号</th>
                    <th className="px-4 py-3 text-left">发证日期</th>
                    <th className="px-4 py-3 text-left">有效期至</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">{r.licenseType}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{r.licenseNo || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">{r.issueDate ? new Date(r.issueDate).toLocaleDateString("zh-CN") : "-"}</td>
                      <td className="px-4 py-3">
                        {r.expiryDate ? (
                          <span className={isExpired(r.expiryDate) ? "text-red-600 font-medium" : isExpiringSoon(r.expiryDate) ? "text-orange-600" : "text-gray-500"}>
                            {new Date(r.expiryDate).toLocaleDateString("zh-CN")}
                            {isExpired(r.expiryDate) && " (已过期)"}
                            {isExpiringSoon(r.expiryDate) && !isExpired(r.expiryDate) && " (即将到期)"}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {r.licenseUrl && (
                            <a href={r.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs">查看</a>
                          )}
                          <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 text-xs">编辑</button>
                          <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-800 text-xs">删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length === 0 && <div className="p-8 text-center text-gray-400">暂无证照记录</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function LicensesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">加载中...</div>}>
      <LicensesContent />
    </Suspense>
  );
}
