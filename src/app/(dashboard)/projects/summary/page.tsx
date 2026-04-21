"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";

type SummaryType = "daily" | "monthly" | "yearly";

interface ProjectStat {
  id: string;
  name: string;
  status: string;
  clientName: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface SummaryData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  projectCount: number;
  projectStats: ProjectStat[];
  dailyStats: { period: string; revenue: number; count: number }[];
}

export default function ProjectSummaryPage() {
  const router = useRouter();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryType, setSummaryType] = useState<SummaryType>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  useEffect(() => {
    loadSummary();
  }, [summaryType]);

  const loadSummary = () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ type: summaryType });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (selectedProject) params.append("projectId", selectedProject);

    fetch(`/api/projects/summary?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSummaryData(d.data);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 10000) {
      return `¥${(value / 10000).toFixed(2)}万`;
    }
    return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
  };

  const formatFullCurrency = (value: number) => {
    return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
  };

  const handleQuery = () => {
    loadSummary();
  };

  if (loading && !summaryData) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 h-24 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !summaryData) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>
        <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700">
          ← 返回
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="text-gray-500 hover:text-gray-700">
            ← 返回
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">项目汇总</h1>
        </div>
      </div>

      {/* 筛选条件 */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 时间维度切换 */}
          <div>
            <label className="label">时间维度</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(["daily", "monthly", "yearly"] as SummaryType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSummaryType(type)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    summaryType === type
                      ? "bg-white shadow text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {type === "daily" ? "日报" : type === "monthly" ? "月报" : "年报"}
                </button>
              ))}
            </div>
          </div>

          {/* 日期范围 */}
          <div>
            <label className="label">开始日期</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">结束日期</label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* 查询按钮 */}
          <button onClick={handleQuery} className="btn-primary">
            查询
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {summaryData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border-t-4 border-blue-500">
            <div className="text-sm text-gray-500">项目总数</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summaryData.projectCount}</div>
          </div>
          <div className="card p-4 border-t-4 border-green-500">
            <div className="text-sm text-gray-500">总收入（产值）</div>
            <div className="text-2xl font-bold text-green-600 mt-1 font-mono">
              {formatCurrency(summaryData.totalRevenue)}
            </div>
          </div>
          <div className="card p-4 border-t-4 border-orange-500">
            <div className="text-sm text-gray-500">总支出（成本）</div>
            <div className="text-2xl font-bold text-orange-600 mt-1 font-mono">
              {formatCurrency(summaryData.totalCost)}
            </div>
          </div>
          <div className="card p-4 border-t-4 border-purple-500">
            <div className="text-sm text-gray-500">总利润</div>
            <div className={`text-2xl font-bold mt-1 font-mono ${
              summaryData.totalProfit >= 0 ? "text-purple-600" : "text-red-600"
            }`}>
              {formatCurrency(summaryData.totalProfit)}
            </div>
            <div className={`text-xs mt-1 ${
              summaryData.totalProfit >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              利润率: {summaryData.totalRevenue > 0 
                ? `${(summaryData.totalProfit / summaryData.totalRevenue * 100).toFixed(1)}%`
                : "0%"
              }
            </div>
          </div>
        </div>
      )}

      {/* 趋势图表 */}
      {summaryData && summaryData.dailyStats.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-4">
            {summaryType === "daily" ? "每日" : summaryType === "monthly" ? "每月" : "每年"}产值趋势
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summaryData.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  tickFormatter={(value) => value >= 10000 ? `${(value/10000).toFixed(0)}万` : value}
                />
                <Tooltip 
                  formatter={(value: number) => [formatFullCurrency(value), "产值"]}
                  labelFormatter={(label) => `时间: ${label}`}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="产值" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name="出库次数" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 项目明细表 */}
      {summaryData && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">项目明细</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">项目名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">甲方</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">产值</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">成本</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">利润</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">利润率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summaryData.projectStats.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <Link href={`/projects/${project.id}`} className="text-blue-600 hover:text-blue-700">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{project.clientName || "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      project.status === "进行中" ? "bg-green-100 text-green-800" :
                      project.status === "已完成" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-green-600">
                    {formatFullCurrency(project.revenue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-orange-600">
                    {formatFullCurrency(project.cost)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-mono ${
                    project.profit >= 0 ? "text-blue-600" : "text-red-600"
                  }`}>
                    {formatFullCurrency(project.profit)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-mono ${
                    project.profit >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {project.revenue > 0 
                      ? `${(project.profit / project.revenue * 100).toFixed(1)}%`
                      : "-"
                    }
                  </td>
                </tr>
              ))}
              {summaryData.projectStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    暂无项目数据
                  </td>
                </tr>
              )}
            </tbody>
            {summaryData.projectStats.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">合计</td>
                  <td colSpan={2}></td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-green-600">
                    {formatFullCurrency(summaryData.totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-orange-600">
                    {formatFullCurrency(summaryData.totalCost)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                    summaryData.totalProfit >= 0 ? "text-blue-600" : "text-red-600"
                  }`}>
                    {formatFullCurrency(summaryData.totalProfit)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                    summaryData.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {summaryData.totalRevenue > 0 
                      ? `${(summaryData.totalProfit / summaryData.totalRevenue * 100).toFixed(1)}%`
                      : "-"
                    }
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
