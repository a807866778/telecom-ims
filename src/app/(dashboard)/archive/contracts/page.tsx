"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUpload } from "@/components/UploadButton";

interface ProjectContract {
  id: string;
  projectId: string | null;
  projectName: string | null;
  contractNo: string;
  contractName: string;
  contractUrl: string | null;
  amount: number;
  signDate: number | null;
  remark: string | null;
  createdAt: number;
}

interface Project {
  id: string;
  name: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ProjectContract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<ProjectContract | null>(null);
  const [form, setForm] = useState({
    projectId: "",
    contractNo: "",
    contractName: "",
    amount: "",
    signDate: "",
    remark: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, handleFileChange } = useUpload();

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/archive/contracts");
    const data = await res.json();
    if (data.success) setContracts(data.data);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchData(),
      fetch("/api/projects").then((r) => r.json()),
    ]).then(([, projData]) => {
      if (projData.success) setProjects(projData.data);
      setLoading(false);
    });
  }, [fetchData]);

  // 生成合同编号: HT + yyyymmdd + seq
  const generateContractNo = () => {
    const now = new Date();
    const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    return `HT${yyyymmdd}`;
  };

  const openAddForm = () => {
    resetForm();
    // 自动生成带序号的合同编号
    const baseNo = generateContractNo();
    // 查询当天最大序号
    const todayContracts = contracts.filter(c => c.contractNo && c.contractNo.startsWith(baseNo));
    const maxSeq = todayContracts.reduce((max, c) => {
      const seq = parseInt(c.contractNo.replace(baseNo, ""), 10);
      return isNaN(seq) ? max : Math.max(max, seq);
    }, 0);
    const newSeq = String(maxSeq + 1).padStart(3, "0");
    setForm(prev => ({ ...prev, contractNo: `${baseNo}${newSeq}` }));
    setShowAddForm(true);
  };

  const resetForm = () => {
    setForm({ projectId: "", contractNo: "", contractName: "", amount: "", signDate: "", remark: "" });
    setContractUrl("");
    setEditItem(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: any = {
      projectId: form.projectId || null,
      contractNo: form.contractNo,
      amount: parseFloat(form.amount) || 0,
      signDate: form.signDate ? new Date(form.signDate).getTime() : null,
      remark: form.remark,
      contractUrl: contractUrl || null,
    };

    const isEdit = !!editItem;
    const res = await fetch("/api/archive/contracts", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { ...payload, id: editItem.id } : payload),
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

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该合同？")) return;
    await fetch("/api/archive/contracts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
  };

  const openEdit = (item: ProjectContract) => {
    setEditItem(item);
    setForm({
      projectId: item.projectId || "",
      contractNo: item.contractNo,
      contractName: item.contractName || "",
      amount: String(item.amount),
      signDate: item.signDate ? new Date(item.signDate).toISOString().slice(0, 10) : "",
      remark: item.remark || "",
    });
    setContractUrl(item.contractUrl || "");
    setShowAddForm(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
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
        <h1 className="text-xl font-semibold text-gray-900">项目合同</h1>
        <button
          onClick={openAddForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 添加合同
        </button>
      </div>

      {/* Form */}
      {showAddForm && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">{editItem ? "编辑合同" : "添加合同"}</h2>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">合同编号</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.contractNo} onChange={(e) => setForm({ ...form, contractNo: e.target.value })} placeholder="留空则自动生成，如：HT2026041901" />
                <p className="text-xs text-gray-400 mt-1">不填则系统自动生成，规则：HT+日期+序号</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">合同名称</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.contractName} onChange={(e) => setForm({ ...form, contractName: e.target.value })} placeholder="合同标题" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联项目</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                  <option value="">选择项目（可选）</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">合同金额</label>
                <input type="number" step="0.01" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">签订日期</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.signDate} onChange={(e) => setForm({ ...form, signDate: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">合同扫描件</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {uploading ? (
                      <span className="text-sm">上传中...</span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>上传合同</span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(e, []).then((files) => {
                        if (files.length > 0) setContractUrl(files[files.length - 1].url);
                      })}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {contractUrl && (
                    <a href={contractUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">查看已上传合同</a>
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
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left">合同编号</th>
                <th className="px-4 py-3 text-left">合同名称</th>
                <th className="px-4 py-3 text-left">关联项目</th>
                <th className="px-4 py-3 text-left">金额</th>
                <th className="px-4 py-3 text-left">签订日期</th>
                <th className="px-4 py-3 text-left">备注</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{c.contractNo}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{c.contractName || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.projectName || "-"}</td>
                  <td className="px-4 py-3 font-mono">
                    {c.amount > 0 ? `¥${c.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.signDate ? new Date(c.signDate).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{c.remark || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {c.contractUrl && (
                        <button onClick={() => window.open(c.contractUrl, "_blank")} className="text-green-600 hover:text-green-800 text-xs">查看合同</button>
                      )}
                      <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs">编辑</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-xs">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contracts.length === 0 && (
            <div className="p-8 text-center text-gray-400">暂无合同</div>
          )}
        </div>
      </div>
    </div>
  );
}
