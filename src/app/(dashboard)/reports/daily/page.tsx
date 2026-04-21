"use client";

import { useEffect, useState } from "react";

interface DailySummary {
  outboundCount: number;
  inboundCount: number;
  purchaseCount: number;
  revenue: number;
  cost: number;
  profit: number;
  purchaseTotal: number;
}

export default function DailyReportPage() {
  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [data, setData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [outboundList, setOutboundList] = useState<any[]>([]);
  const [inboundList, setInboundList] = useState<any[]>([]);
  const [purchaseList, setPurchaseList] = useState<any[]>([]);

  const fetchData = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/daily?date=${date}`);
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
    fetchData(selectedDate);
  }, [selectedDate]);

  const formatMoney = (n: number) =>
    n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  const goDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">日报表</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goDate(-1)}
            className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
          >
            ← 前一天
          </button>
          <input
            type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={defaultDate}
          />
          <button
            onClick={() => goDate(1)}
            disabled={selectedDate >= defaultDate}
            className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-40"
          >
            后一天 →
          </button>
          <button
            onClick={() => setSelectedDate(defaultDate)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            今天
          </button>
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
            <div className="card p-5 text-center border-l-4 border-green-500">
              <div className="text-sm text-gray-500 mb-1">当日产值</div>
              <div className="text-2xl font-bold text-green-600 font-mono">
                ¥{formatMoney(data?.revenue || 0)}
              </div>
            </div>
            <div className="card p-5 text-center border-l-4 border-orange-500">
              <div className="text-sm text-gray-500 mb-1">当日成本</div>
              <div className="text-2xl font-bold text-orange-500 font-mono">
                ¥{formatMoney(data?.cost || 0)}
              </div>
            </div>
            <div className="card p-5 text-center border-l-4 border-blue-500">
              <div className="text-sm text-gray-500 mb-1">当日利润</div>
              <div className={`text-2xl font-bold font-mono ${(data?.profit || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                ¥{formatMoney(data?.profit || 0)}
              </div>
            </div>
            <div className="card p-5 text-center border-l-4 border-purple-500">
              <div className="text-sm text-gray-500 mb-1">采购支出</div>
              <div className="text-2xl font-bold text-purple-600 font-mono">
                ¥{formatMoney(data?.purchaseTotal || 0)}
              </div>
            </div>
          </div>

          {/* 数量 */}
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
              <div className="text-sm text-gray-500 mb-1">采购单数</div>
              <div className="text-3xl font-bold text-gray-700">{data?.purchaseCount || 0}</div>
            </div>
          </div>

          {/* 出库记录 */}
          {outboundList.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="font-medium text-gray-700">出库记录</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1e3a5f] text-white">
                      <th className="px-4 py-2 text-left font-medium">单号</th>
                      <th className="px-4 py-2 text-left font-medium">项目</th>
                      <th className="px-4 py-2 text-left font-medium">状态</th>
                      <th className="px-4 py-2 text-left font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outboundList.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{r.orderNo || r.id?.slice(0, 8)}</td>
                        <td className="px-4 py-2">{r.projectName || "-"}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                            {r.status || "已完成"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500">{formatTime(r.createdAt)}</td>
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
                <h2 className="font-medium text-gray-700">采购记录</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1e3a5f] text-white">
                      <th className="px-4 py-2 text-left font-medium">单号</th>
                      <th className="px-4 py-2 text-left font-medium">供应商</th>
                      <th className="px-4 py-2 text-left font-medium">金额</th>
                      <th className="px-4 py-2 text-left font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {purchaseList.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{r.orderNo || r.id?.slice(0, 8)}</td>
                        <td className="px-4 py-2">{r.supplierName || "-"}</td>
                        <td className="px-4 py-2 font-mono text-sm">¥{formatMoney(r.totalAmount || 0)}</td>
                        <td className="px-4 py-2 text-gray-500">{formatTime(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(data?.outboundCount === 0 && data?.inboundCount === 0 && data?.purchaseCount === 0) && (
            <div className="card p-8 text-center text-gray-400">
              {selectedDate} 暂无业务数据
            </div>
          )}
        </>
      )}
    </div>
  );
}
