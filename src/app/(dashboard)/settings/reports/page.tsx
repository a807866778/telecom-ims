"use client";

import { useEffect, useState } from "react";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");

  const generateReport = async () => {
    setGenerating(true);
    setError("");
    setReport(null);

    try {
      const params = new URLSearchParams({ type: reportType, year: String(year) });
      if (reportType === "monthly") params.set("month", String(month));

      const res = await fetch(`/api/settings/reports?${params}`);
      const data = await res.json();

      if (data.success) {
        setReport(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("生成报表失败");
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">报表生成</h1>

      {/* 报表配置 */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">选择报表类型</h2>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">报表类型</label>
            <select
              className="w-40 px-3 py-2 border border-gray-200 rounded-lg"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="monthly">月度报表</option>
              <option value="yearly">年度报表</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">年份</label>
            <select
              className="w-32 px-3 py-2 border border-gray-200 rounded-lg"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </div>
          {reportType === "monthly" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
              <select
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? "生成中..." : "生成报表"}
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {/* 报表结果 */}
      {report && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-gray-900">
              {reportType === "monthly" ? `${year}年${month}月` : `${year}年`} 运营报表
            </h2>
            <span className="text-xs text-gray-400">
              生成时间: {new Date().toLocaleString("zh-CN")}
            </span>
          </div>

          {/* 汇总数据 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600">入库次数</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{report.inboundCount || 0}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600">出库次数</div>
              <div className="text-2xl font-bold text-green-900 mt-1">{report.outboundCount || 0}</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600">总成本</div>
              <div className="text-2xl font-bold text-purple-900 mt-1 font-mono">
                ¥{(report.totalCost || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-orange-600">总产值</div>
              <div className="text-2xl font-bold text-orange-900 mt-1 font-mono">
                ¥{(report.totalRevenue || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* 项目汇总 */}
          {report.projects && report.projects.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-3">项目数据</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left">项目名称</th>
                      <th className="px-4 py-3 text-left">状态</th>
                      <th className="px-4 py-3 text-right">成本</th>
                      <th className="px-4 py-3 text-right">产值</th>
                      <th className="px-4 py-3 text-right">利润</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.projects.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          ¥{(p.totalCost || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          ¥{(p.totalRevenue || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span
                            className={
                              (p.totalRevenue || 0) - (p.totalCost || 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            ¥{((p.totalRevenue || 0) - (p.totalCost || 0)).toLocaleString("zh-CN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 培训记录 */}
          {report.trainingStats && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-medium text-gray-700 mb-3">培训考核统计</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">培训完成人次</div>
                  <div className="text-xl font-bold">{report.trainingStats.totalCompletions || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">平均得分</div>
                  <div className="text-xl font-bold">{report.trainingStats.avgScore || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">通过率</div>
                  <div className="text-xl font-bold text-green-600">
                    {report.trainingStats.passRate || 0}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
