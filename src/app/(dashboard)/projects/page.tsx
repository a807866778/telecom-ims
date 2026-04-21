"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Project {
  id: string;
  name: string;
  status: string;
  clientName: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  address: string | null;
  bankAccount: string | null;
  taxNumber: string | null;
  invoiceTitle: string | null;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  createdAt: number;
}

type ViewMode = "kanban" | "table";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [summaryData, setSummaryData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProjects(d.data);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });

    // 获取汇总数据
    fetch("/api/projects/summary?type=monthly")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSummaryData(d.data);
        }
      })
      .catch(() => {});
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-CN");
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(1)}万`;
    }
    return `¥${value.toFixed(0)}`;
  };

  const statusColors: Record<string, string> = {
    "进行中": "bg-green-100 text-green-800 border-green-200",
    "已完成": "bg-blue-100 text-blue-800 border-blue-200",
    "已归档": "bg-gray-100 text-gray-600 border-gray-200",
  };

  // 看板列
  const kanbanColumns = [
    { key: "进行中", title: "进行中", color: "border-green-500" },
    { key: "已完成", title: "已完成", color: "border-blue-500" },
    { key: "已归档", title: "已归档", color: "border-gray-500" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 h-64 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-20 mb-4"></div>
              <div className="space-y-3">
                {[1, 2].map(j => (
                  <div key={j} className="h-24 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl">加载失败: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">项目管理</h1>
        <div className="flex gap-2">
          {/* 视图切换 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === "kanban" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              看板
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === "table" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              列表
            </button>
          </div>
          <Link href="/projects/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 新建项目
          </Link>
          <Link href="/projects/summary" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            📊 汇总报表
          </Link>
        </div>
      </div>

      {/* 看板视图 */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-3 gap-4">
          {kanbanColumns.map((column) => {
            const columnProjects = projects.filter((p) => p.status === column.key);
            return (
              <div key={column.key} className="flex flex-col">
                {/* 列头 */}
                <div className={`px-4 py-3 rounded-t-lg bg-white border-t-4 ${column.color}`}>
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">{column.title}</h3>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 text-sm rounded-full">
                      {columnProjects.length}
                    </span>
                  </div>
                </div>

                {/* 列内容 */}
                <div className="flex-1 bg-gray-50 rounded-b-lg p-2 min-h-96 space-y-2">
                  {columnProjects.map((project) => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900 truncate">{project.name}</h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[project.status]}`}>
                            {project.status}
                          </span>
                        </div>

                        {project.clientName && (
                          <div className="text-sm text-gray-500 mb-1">甲方: {project.clientName}</div>
                        )}

                        {project.address && (
                          <div className="text-xs text-gray-400 mb-2 truncate flex items-center gap-1">
                            📍 {project.address}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                          <div>
                            <div className="text-xs text-gray-400">产值</div>
                            <div className="text-sm font-semibold text-green-600 font-mono truncate">
                              {formatCurrency(project.totalRevenue)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">成本</div>
                            <div className="text-sm font-semibold text-orange-600 font-mono truncate">
                              {formatCurrency(project.totalCost)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">利润</div>
                            <div className={`text-sm font-semibold font-mono truncate ${
                              project.totalProfit >= 0 ? "text-blue-600" : "text-red-600"
                            }`}>
                              {formatCurrency(project.totalProfit)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}

                  {columnProjects.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      暂无{column.title}项目
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 列表视图 */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">项目名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">甲方</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">联系人</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">联系电话</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">开户行</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">税号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">开票信息</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">产值</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">成本</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">利润</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{project.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{project.clientName || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{project.contactPerson || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{project.contactPhone || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs max-w-[120px] truncate" title={project.bankAccount || ""}>{project.bankAccount || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs max-w-[100px] truncate" title={project.taxNumber || ""}>{project.taxNumber || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate" title={project.invoiceTitle || ""}>{project.invoiceTitle || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-600">
                      ¥{project.totalRevenue.toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-600">
                      ¥{project.totalCost.toLocaleString("zh-CN")}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono ${
                      project.totalProfit >= 0 ? "text-blue-600" : "text-red-600"
                    }`}>
                      ¥{project.totalProfit.toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(project.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/projects/${project.id}`} className="text-blue-600 hover:text-blue-700">
                        查看详情
                      </Link>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-gray-400">
                      暂无项目，<Link href="/projects/new" className="text-blue-600">创建第一个项目</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 汇总卡片（仅看板视图显示） */}
      {viewMode === "kanban" && summaryData && (
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-gray-500">项目总数</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summaryData.projectCount}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">总产值</div>
            <div className="text-2xl font-bold text-green-600 mt-1 font-mono">
              ¥{(summaryData.totalRevenue / 10000).toFixed(1)}万
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">总成本</div>
            <div className="text-2xl font-bold text-orange-600 mt-1 font-mono">
              ¥{(summaryData.totalCost / 10000).toFixed(1)}万
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">总利润</div>
            <div className={`text-2xl font-bold mt-1 font-mono ${
              summaryData.totalProfit >= 0 ? "text-blue-600" : "text-red-600"
            }`}>
              ¥{(summaryData.totalProfit / 10000).toFixed(1)}万
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
