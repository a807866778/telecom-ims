"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Contact {
  id: string;
  type: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  bankAccount: string;
  bankName: string;
  taxNo: string;
  businessLicense: string;
  invoiceTitle: string;
  remark: string;
  createdAt: number;
}

type FilterType = "all" | "supplier" | "distributor";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchContacts = useCallback(async () => {
    const typeParam = filterType === "all" ? "" : `?type=${filterType}`;
    const res = await fetch(`/api/archive/contacts${typeParam}`);
    const data = await res.json();
    if (data.success) setContacts(data.data);
  }, [filterType]);

  useEffect(() => {
    fetchContacts().then(() => setLoading(false));
  }, [fetchContacts]);

  // 过滤
  const filtered = contacts.filter((c) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      c.name.toLowerCase().includes(kw) ||
      c.contact.toLowerCase().includes(kw) ||
      c.phone.includes(kw) ||
      c.address.toLowerCase().includes(kw)
    );
  });

  // CSV 导出
  const exportCSV = () => {
    const headers = ["类型", "名称", "联系人", "电话", "地址", "银行账号", "开户行", "税号", "发票抬头", "备注"];
    const rows = filtered.map((c) => [
      c.type,
      c.name,
      c.contact,
      c.phone,
      c.address,
      c.bankAccount,
      c.bankName,
      c.taxNo,
      c.invoiceTitle,
      c.remark,
    ]);

    const csvContent =
      "\uFEFF" + // BOM for UTF-8
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `通讯录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const typeColors: Record<string, string> = {
    "供应商": "bg-blue-100 text-blue-700",
    "客户": "bg-green-100 text-green-700",
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

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">通讯录</h1>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          📥 导出 CSV
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex gap-4 items-center">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { key: "all", label: "全部" },
            { key: "supplier", label: "供应商" },
            { key: "distributor", label: "客户" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key as FilterType)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                filterType === f.key
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="搜索名称、联系人、电话、地址..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">全部联系人数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{contacts.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">供应商</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {contacts.filter((c) => c.type === "供应商").length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">客户</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {contacts.filter((c) => c.type === "客户").length}
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">联系人</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">电话</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">地址</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">银行账号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">税号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">发票抬头</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((contact) => (
                <tr key={`${contact.type}-${contact.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        typeColors[contact.type] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {contact.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{contact.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{contact.contact || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{contact.phone || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-48">{contact.address || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{contact.bankAccount || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{contact.taxNo || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-32">{contact.invoiceTitle || "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    暂无通讯录数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
