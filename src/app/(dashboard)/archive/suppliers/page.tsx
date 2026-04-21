"use client";

import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  businessLicense: string | null;
  contractUrls: string | null;
  bankAccount: string | null;
  bankName: string | null;
  taxNo: string | null;
  invoiceTitle: string | null;
  paymentRecords: string | null;
  remark: string | null;
  createdAt: number;
  updatedAt: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    address: "",
    bankAccount: "",
    bankName: "",
    taxNo: "",
    invoiceTitle: "",
    remark: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewItem, setViewItem] = useState<Supplier | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    if (data.success) setSuppliers(data.data);
  }, []);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const resetForm = () => {
    setForm({ name: "", contactPerson: "", phone: "", address: "", bankAccount: "", bankName: "", taxNo: "", invoiceTitle: "", remark: "" });
    setEditItem(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const isEdit = !!editItem;
    const res = await fetch("/api/suppliers", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { ...form, id: editItem.id } : form),
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
    if (!confirm("确定删除该供应商？")) return;
    await fetch("/api/suppliers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
  };

  const openEdit = (item: Supplier) => {
    setEditItem(item);
    setForm({
      name: item.name,
      contactPerson: item.contactPerson || "",
      phone: item.phone || "",
      address: item.address || "",
      bankAccount: item.bankAccount || "",
      bankName: item.bankName || "",
      taxNo: item.taxNo || "",
      invoiceTitle: item.invoiceTitle || "",
      remark: item.remark || "",
    });
    setShowAddForm(true);
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contactPerson || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || "").includes(searchTerm)
  );

  // Excel Export
  const exportExcel = () => {
    const exportData = filtered.map((s) => ({
      "名称": s.name,
      "联系人": s.contactPerson || "",
      "手机号": s.phone || "",
      "地址": s.address || "",
      "开户银行": s.bankName || "",
      "银行账号": s.bankAccount || "",
      "税号": s.taxNo || "",
      "开票抬头": s.invoiceTitle || "",
      "备注": s.remark || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "供应商档案");

    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 名称
      { wch: 12 }, // 联系人
      { wch: 15 }, // 手机号
      { wch: 30 }, // 地址
      { wch: 20 }, // 开户银行
      { wch: 20 }, // 银行账号
      { wch: 20 }, // 税号
      { wch: 30 }, // 开票抬头
      { wch: 30 }, // 备注
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `供应商档案_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
        <h1 className="text-xl font-semibold text-gray-900">供应商档案</h1>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            📥 导出 Excel
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 添加供应商
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <input
          type="text"
          placeholder="搜索供应商名称、联系人、手机号..."
          className="w-full px-4 py-2 border border-gray-200 rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Add/Edit form */}
      {showAddForm && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">
              {editItem ? "编辑供应商" : "添加供应商"}
            </h2>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开户银行</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">银行账号</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.bankAccount}
                  onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">税号</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.taxNo}
                  onChange={(e) => setForm({ ...form, taxNo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开票抬头</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.invoiceTitle}
                  onChange={(e) => setForm({ ...form, invoiceTitle: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
              />
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

      {/* Detail modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewItem(null)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{viewItem.name}</h2>
              <button onClick={() => setViewItem(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">联系人</span>
                <span>{viewItem.contactPerson || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">手机号</span>
                <span>{viewItem.phone || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">地址</span>
                <span className="text-right max-w-[60%]">{viewItem.address || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">开户银行</span>
                <span>{viewItem.bankName || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">银行账号</span>
                <span className="font-mono">{viewItem.bankAccount || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">税号</span>
                <span className="font-mono">{viewItem.taxNo || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">开票抬头</span>
                <span>{viewItem.invoiceTitle || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">备注</span>
                <span className="text-right max-w-[60%]">{viewItem.remark || "-"}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => { setViewItem(null); openEdit(viewItem); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                编辑
              </button>
              <button
                onClick={() => setViewItem(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left">名称</th>
                <th className="px-4 py-3 text-left">联系人</th>
                <th className="px-4 py-3 text-left">手机号</th>
                <th className="px-4 py-3 text-left">地址</th>
                <th className="px-4 py-3 text-left">更新时间</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewItem(s)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.contactPerson || "-"}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{s.phone || "-"}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{s.address || "-"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(s.updatedAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 text-xs">
                        编辑
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 text-xs">
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              {searchTerm ? "未找到匹配的供应商" : "暂无供应商"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
