"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface StaffMember {
  id: string;
  name: string;
  phone: string | null;
  idCard: string | null;
  position: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  status: string;
  joinDate: number | null;
  leaveDate: number | null;
  remark: string | null;
  createdAt: number;
}

export default function StaffListPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    idCard: "",
    position: "",
    emergencyContact: "",
    emergencyPhone: "",
    status: "在职",
    joinDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/staff/list");
    const data = await res.json();
    if (data.success) setStaff(data.data);
  }, []);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const resetForm = () => {
    setForm({ name: "", phone: "", idCard: "", position: "", emergencyContact: "", emergencyPhone: "", status: "在职", joinDate: "" });
    setEditItem(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: any = {
      ...form,
      joinDate: form.joinDate ? new Date(form.joinDate).getTime() : null,
    };

    const isEdit = !!editItem;
    const res = await fetch("/api/staff/list", {
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
    if (!confirm("确定删除该人员？关联的健康档案和证照也将被删除。")) return;
    await fetch("/api/staff/list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
  };

  const openEdit = (item: StaffMember) => {
    setEditItem(item);
    setForm({
      name: item.name,
      phone: item.phone || "",
      idCard: item.idCard || "",
      position: item.position || "",
      emergencyContact: item.emergencyContact || "",
      emergencyPhone: item.emergencyPhone || "",
      status: item.status,
      joinDate: item.joinDate ? new Date(item.joinDate).toISOString().slice(0, 10) : "",
    });
    setShowAddForm(true);
  };

  const filtered = staff.filter((s) => {
    const matchSearch = s.name.includes(searchTerm) || (s.phone || "").includes(searchTerm) || (s.position || "").includes(searchTerm);
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4"><div className="animate-pulse space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded"></div>)}</div></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">人员档案</h1>
        <button onClick={() => { resetForm(); setShowAddForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 添加人员
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 card p-3">
          <input type="text" placeholder="搜索姓名、手机号、职位..." className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[{ key: "all", label: "全部" }, { key: "在职", label: "在职" }, { key: "离职", label: "离职" }].map((f) => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-3 py-1.5 text-sm rounded-lg ${filterStatus === f.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">总人数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{staff.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">在职</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{staff.filter((s) => s.status === "在职").length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">离职</div>
          <div className="text-2xl font-bold text-gray-400 mt-1">{staff.filter((s) => s.status === "离职").length}</div>
        </div>
      </div>

      {/* Form */}
      {showAddForm && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">{editItem ? "编辑人员" : "添加人员"}</h2>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <input type="text" required className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">身份证号</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.idCard} onChange={(e) => setForm({ ...form, idCard: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职位</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="如：施工员、项目经理" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">紧急联系人</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">紧急联系电话</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="在职">在职</option>
                  <option value="离职">离职</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">入职日期</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
              </div>
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
                <th className="px-4 py-3 text-left">姓名</th>
                <th className="px-4 py-3 text-left">手机号</th>
                <th className="px-4 py-3 text-left">职位</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">入职日期</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{s.phone || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{s.position || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${s.status === "在职" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.joinDate ? new Date(s.joinDate).toLocaleDateString("zh-CN") : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/staff/health?staffId=${s.id}`} className="text-blue-600 hover:text-blue-800 text-xs">健康</Link>
                      <Link href={`/staff/licenses?staffId=${s.id}`} className="text-purple-600 hover:text-purple-800 text-xs">证照</Link>
                      <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 text-xs">编辑</button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 text-xs">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-8 text-center text-gray-400">{searchTerm ? "未找到匹配人员" : "暂无人员"}</div>}
        </div>
      </div>
    </div>
  );
}
