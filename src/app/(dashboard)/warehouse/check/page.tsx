"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StockCheck {
  id: string;
  checkMonth: string;
  status: string;
  totalItems: number;
  diffItems: number;
  operatorId: string;
  operatorName: string | null;
  remark: string | null;
  createdAt: number;
  completedAt: number | null;
}

export default function StockCheckListPage() {
  const router = useRouter();
  const [checks, setChecks] = useState<StockCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [checkMonth, setCheckMonth] = useState("");

  useEffect(() => {
    fetchChecks();
    // 设置默认月份为当前月份
    const now = new Date();
    setCheckMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  }, []);

  const fetchChecks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/warehouse/check");
      const data = await res.json();
      if (data.success) {
        setChecks(data.data || []);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/warehouse/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkMonth }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchChecks();
        // 跳转到详情页
        router.push(`/warehouse/check/${data.data.id}`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(String(err));
    }
  };

  const formatDateTime = (timestamp: number | null | undefined) => {
    if (!timestamp) return "-";
    try {
      return new Date(timestamp).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
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
        <h1 className="text-xl font-semibold text-gray-900">库存盘点</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 新增盘点
        </button>
      </div>

      {/* 盘点列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-4 py-3 text-left text-sm font-medium">盘点月份</th>
                <th className="px-4 py-3 text-center text-sm font-medium">状态</th>
                <th className="px-4 py-3 text-right text-sm font-medium">物料总数</th>
                <th className="px-4 py-3 text-right text-sm font-medium">差异项</th>
                <th className="px-4 py-3 text-left text-sm font-medium">创建人</th>
                <th className="px-4 py-3 text-left text-sm font-medium">创建时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium">完成时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {checks.map((check) => (
                <tr key={check.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{check.checkMonth || "-"}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    {check.status === "进行中" || check.status === "pending" ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                        进行中
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        已完成
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{check.totalItems}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {check.diffItems > 0 ? (
                      <span className="text-red-600 font-medium">{check.diffItems}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{check.operatorName || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(check.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {check.completedAt ? formatDateTime(check.completedAt) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/warehouse/check/${check.id}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {check.status === "进行中" || check.status === "pending" ? "继续盘点" : "查看详情"}
                    </Link>
                  </td>
                </tr>
              ))}
              {checks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    暂无盘点记录，点击"新增盘点"开始
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增盘点弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">新增库存盘点</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">盘点月份 *</label>
                <input
                  type="month"
                  value={checkMonth}
                  onChange={(e) => setCheckMonth(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="text-sm text-gray-500">
                系统将自动获取所有物料的当前库存作为系统库存。
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  创建盘点
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
