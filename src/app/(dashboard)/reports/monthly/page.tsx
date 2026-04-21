"use client";

import { useEffect, useState } from "react";

interface MonthlySummary {
  month: string;
  outboundCount: number;
  inboundCount: number;
  revenue: number;
  cost: number;
  profit: number;
  purchaseTotal: number;
  purchaseCount: number;
}

export default function MonthlyReportPage() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [data, setData] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [outboundList, setOutboundList] = useState<any[]>([]);
  const [inboundList, setInboundList] = useState<any[]>([]);
  const [purchaseList, setPurchaseList] = useState<any[]>([]);

  const fetchData = async (month: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?month=${month}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data.summary);
        setOutboundList(json.data.outbounds || []);
        setInboundList(json.data.inbounds || []);
        setPurchaseList(json.data.purchases || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

  const formatMoney = (n: number) =>
    n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("zh-CN");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">月报表</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">选择月份：</label>
          <input
            type="month"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 text-center">
              <div className="text-sm text-gray-500 mb-1">月产值</div>
              <div className="text-2xl font-bold text-green-600 font-mono">
                ¥{formatMoney(data?.revenue || 0)}
              </div>
            </div>
            <div className="card p-5 text-center">
              <div className="text-sm text-gray-500 mb-1">月成本</div>
              <div className="text-2xl font-bold text-orange-500 font-mono">
                ¥{formatMoney(data?.cost || 0)}
              </div>
            </div>
            <div className="card p-5 text-center">
              <div className="text-sm text-gray-500 mb-1">月利润</div>
              <div className={`text-2xl font-bold font-mono ${(data?.profit || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                ¥{formatMoney(data?.profit || 0)}
              </div>
            </div>
            <div className="card p-5 text-center">
              <div className="text-sm text-gray-500 mb-1">采购支出</div>
              <div className="text-2xl font-bold text-purple-600 font-mono">
                ¥{formatMoney(data?.purchaseTotal || 0)}
              </div>
            </div>
          </div>

          {/* 数量统计 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <div className="text-sm text-gray-500 mb-1">出库单数</div>
              <div className="text-3xl font-bold text-gray-700">{data?.outboundCount || 0}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-sm text-gray-500 mb-1">入库次数</div>
              <div className="text-3xl font-bold text-gray-700">{data?.inboundCount || 0}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-sm text-gray-500 mb-1">采购订单</div>
              <div className="text-3xl font-bold text-gray-700">{data?.purchaseCount || 0}</div>
            </div>
          </div>

          {/* 出库记录 */}
          {outboundList.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="font-medium text-gray-700">出库记录（{outboundList.length}条）</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1e3a5f] text-white">
                      <th className="px-4 py-2 text-left font-medium">单号</th>
                      <th className="px-4 py-2 text-left font-medium">项目</th>
                      <th className="px-4 py-2 text-left font-medium">状态</th>
                      <th className="px-4 py-2 text-left font-medium">日期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outboundList.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{r.orderNo || r.id?.slice(0, 8)}</td>
                        <td className="px-4 py-2">{r.projectName || r.project_name || "-"}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                            {r.status || "已完成"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500">{formatDate(r.createdAt || r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 采购记录 */}
          {purchaseList.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="font-medium text-gray-700">采购记录（{purchaseList.length}条）</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1e3a5f] text-white">
                      <th className="px-4 py-2 text-left font-medium">单号</th>
                      <th className="px-4 py-2 text-left font-medium">供应商</th>
                      <th className="px-4 py-2 text-left font-medium">金额</th>
                      <th className="px-4 py-2 text-left font-medium">日期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {purchaseList.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{r.orderNo || r.order_no || r.id?.slice(0, 8)}</td>
                        <td className="px-4 py-2">{r.supplierName || r.supplier_name || "-"}</td>
                        <td className="px-4 py-2 font-mono">¥{formatMoney(r.totalAmount || r.total_amount || 0)}</td>
                        <td className="px-4 py-2 text-gray-500">{formatDate(r.createdAt || r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(data?.outboundCount === 0 && data?.inboundCount === 0 && data?.purchaseCount === 0) && (
            <div className="card p-8 text-center text-gray-400">
              {selectedMonth} 暂无业务数据
            </div>
          )}
        </>
      )}
    </div>
  );
}
