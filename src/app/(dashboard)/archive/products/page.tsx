"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUpload } from "@/components/UploadButton";

interface ProductArchive {
  id: string;
  name: string;
  distributorId: string | null;
  distributorName: string | null;
  spec: string | null;
  model: string | null;
  remark: string | null;
  manualUrl: string | null;
  certUrl: string | null;
  packagingUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
}

interface UploadedFile {
  id: string;
  url: string;
  fileName: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductArchive[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<ProductArchive | null>(null);
  const [form, setForm] = useState({
    name: "",
    supplierId: "",
    spec: "",
    model: "",
    remark: "",
    packaging: "",
  });
  const [manualUrl, setManualUrl] = useState("");
  const [certUrl, setCertUrl] = useState("");
  const [packagingUrl, setPackagingUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, handleFileChange } = useUpload();

  const fetchData = useCallback(async () => {
    const [productsRes, suppliersRes] = await Promise.all([
      fetch("/api/archive/products"),
      fetch("/api/suppliers"),
    ]);
    const [productsData, suppliersData] = await Promise.all([productsRes.json(), suppliersRes.json()]);
    if (productsData.success) setProducts(productsData.data);
    if (suppliersData.success) setSuppliers(suppliersData.data || []);
  }, []);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const resetForm = () => {
    setForm({ name: "", supplierId: "", spec: "", model: "", remark: "", packaging: "" });
    setManualUrl("");
    setCertUrl("");
    setPackagingUrl("");
    setEditItem(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const isEdit = !!editItem;
    const payload = {
      name: form.name,
      distributorId: form.supplierId || null,
      spec: form.spec || null,
      model: form.model || null,
      remark: form.remark || null,
      manualUrl: manualUrl || null,
      certUrl: certUrl || null,
      packagingUrl: packagingUrl || null,
    };
    const res = await fetch("/api/archive/products", {
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
    if (!confirm("确定删除该商品档案？")) return;
    await fetch("/api/archive/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
  };

  const openEdit = (item: ProductArchive) => {
    setEditItem(item);
    setForm({
      name: item.name,
      supplierId: item.distributorId || "",
      spec: item.spec || "",
      model: item.model || "",
      remark: item.remark || "",
      packaging: item.packagingUrl || "",
    });
    setManualUrl(item.manualUrl || "");
    setCertUrl(item.certUrl || "");
    setPackagingUrl(item.packagingUrl || "");
    setShowAddForm(true);
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.distributorName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.model || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-xl font-semibold text-gray-900">商品档案</h1>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 添加商品
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <input
          type="text"
          placeholder="搜索商品名称、供应商、型号..."
          className="w-full px-4 py-2 border border-gray-200 rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Form */}
      {showAddForm && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">{editItem ? "编辑商品" : "添加商品"}</h2>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品名称 *</label>
                <input type="text" required className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                >
                  <option value="">请选择供应商</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规格</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">型号</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">包装方式</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.packaging} onChange={(e) => setForm({ ...form, packaging: e.target.value })} placeholder="如：箱/个/卷" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">说明书</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {uploading ? (
                      <span className="text-sm">上传中...</span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>上传说明书</span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => handleFileChange(e, []).then((files) => {
                        if (files.length > 0) setManualUrl(files[files.length - 1].url);
                      })}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {manualUrl && (
                    <a href={manualUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">查看已上传</a>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">合格证</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {uploading ? (
                      <span className="text-sm">上传中...</span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>上传合格证</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => handleFileChange(e, []).then((files) => {
                        if (files.length > 0) setCertUrl(files[files.length - 1].url);
                      })}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {certUrl && (
                    <a href={certUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">查看已上传</a>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">包装图片</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {uploading ? (
                      <span className="text-sm">上传中...</span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>上传包装</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => handleFileChange(e, []).then((files) => {
                        if (files.length > 0) setPackagingUrl(files[files.length - 1].url);
                      })}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {packagingUrl && (
                    <a href={packagingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">查看已上传</a>
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
                <th className="px-4 py-3 text-left">商品名称</th>
                <th className="px-4 py-3 text-left">供应商</th>
                <th className="px-4 py-3 text-left">规格</th>
                <th className="px-4 py-3 text-left">型号</th>
                <th className="px-4 py-3 text-left">包装</th>
                <th className="px-4 py-3 text-left">更新时间</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.distributorName || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">{p.spec || "-"}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{p.model || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">{p.packagingUrl || "-"}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(p.updatedAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-xs">编辑</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 text-xs">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400">{searchTerm ? "未找到匹配商品" : "暂无商品档案"}</div>
          )}
        </div>
      </div>
    </div>
  );
}
