"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface OutboundItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string | null;
  materialUnit: string;
  quantity: number;
  unitPrice: number;
}

interface OutboundRecord {
  id: string;
  recordNo: string;
  type: "直接出库" | "退货出库" | "报损出库" | "盘库调整";
  supplierId: string | null;
  supplierName: string | null;
  projectId: string | null;
  projectName: string | null;
  operatorId: string | null;
  operatorName: string | null;
  totalAmount: number;
  remark: string | null;
  photoUrl: string | null;
  createdAt: number;
  items: OutboundItem[];
  itemCount: number;
}

interface Project {
  id: string;
  name: string;
}

const TYPE_COLORS: Record<string, string> = {
  "直接出库": "bg-blue-100 text-blue-700",
  "退货出库": "bg-orange-100 text-orange-700",
  "报损出库": "bg-red-100 text-red-700",
  "盘库调整": "bg-purple-100 text-purple-700",
};

export default function OutboundRecordsPage() {
  const [records, setRecords] = useState<OutboundRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchRecords();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error("获取项目失败:", err);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (projectId) params.set("projectId", projectId);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/warehouse/outbound/records?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchRecords();
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (projectId) params.set("projectId", projectId);
    if (typeFilter) params.set("type", typeFilter);

    window.open(`/api/warehouse/outbound/records/export?${params}`, "_blank");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl">加载失败: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">出库记录</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出报表
          </button>
          <Link href="/outbound" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            新建出库单
          </Link>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4 flex-wrap items-end">
          <div className="w-48">
            <label className="block text-sm text-gray-600 mb-1">项目</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">出库类型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部类型</option>
              <option value="直接出库">直接出库</option>
              <option value="退货出库">退货出库</option>
              <option value="报损出库">报损出库</option>
              <option value="盘库调整">盘库调整</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            查询
          </button>
        </div>
      </div>

      {/* 出库记录表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-4 py-3 text-left text-sm font-medium">出库单号</th>
                <th className="px-4 py-3 text-left text-sm font-medium">类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium">物料名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium">规格</th>
                <th className="px-4 py-3 text-right text-sm font-medium">数量</th>
                <th className="px-4 py-3 text-right text-sm font-medium">总金额</th>
                <th className="px-4 py-3 text-left text-sm font-medium">出库时间</th>
                <th className="px-4 py-3 text-center text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <>
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{record.recordNo.slice(0, 12)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${TYPE_COLORS[record.type] || "bg-gray-100 text-gray-700"}`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.items.length > 0 ? record.items[0].materialName : "-"}
                      {record.items.length > 1 && <span className="text-gray-400 text-xs"> 等{record.items.length}种</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {record.items.length > 0 ? (record.items[0].materialSpec || "-") : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {record.items.reduce((sum, item) => sum + item.quantity, 0)} {record.items[0]?.materialUnit || ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      ¥{record.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(record.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <button
                        onClick={() => toggleExpand(record.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {expandedId === record.id ? "收起" : "详情"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === record.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="space-y-3">
                          {/* 基本信息 */}
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">项目：</span>
                              <span className="font-medium">{record.projectName || "-"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">操作员：</span>
                              <span className="font-medium">{record.operatorName || "-"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">出库单号：</span>
                              <span className="font-mono">{record.recordNo}</span>
                            </div>
                          </div>
                          {/* 出库明细 */}
                          <div className="text-sm font-medium text-gray-700">出库明细：</div>
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left">物料名称</th>
                                <th className="px-3 py-2 text-left">规格</th>
                                <th className="px-3 py-2 text-right">数量</th>
                                <th className="px-3 py-2 text-right">单价</th>
                                <th className="px-3 py-2 text-right">小计</th>
                              </tr>
                            </thead>
                            <tbody>
                              {record.items.map((item) => (
                                <tr key={item.id} className="border-b border-gray-100">
                                  <td className="px-3 py-2">{item.materialName || "(未知物料)"}</td>
                                  <td className="px-3 py-2 text-gray-500">{item.materialSpec || "-"}</td>
                                  <td className="px-3 py-2 text-right">{item.quantity} {item.materialUnit}</td>
                                  <td className="px-3 py-2 text-right font-mono">¥{item.unitPrice.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-mono">
                                    ¥{(item.quantity * item.unitPrice).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {record.photoUrl && (
                            <div className="mt-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">出库照片：</div>
                              <img
                                src={record.photoUrl}
                                alt="出库照片"
                                className="max-w-md rounded-lg border border-gray-200"
                              />
                            </div>
                          )}
                          {record.remark && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">备注：</span>{record.remark}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    暂无出库记录
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
