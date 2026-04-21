"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReturnOrder {
  id: string;
  returnNo: string;
  orderId: string | null;
  orderNo: string;
  supplierId: string | null;
  supplierName: string;
  operatorId: string | null;
  operatorName: string;
  auditorId: string | null;
  auditorName: string;
  totalAmount: number;
  status: string;
  reason: string | null;
  photoUrl: string | null;
  auditRemark: string | null;
  itemCount: number;
  createdAt: number;
  auditedAt: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  "待审核": "bg-yellow-100 text-yellow-700",
  "已审核": "bg-blue-100 text-blue-700",
  "已退货": "bg-green-100 text-green-700",
  "已拒绝": "bg-red-100 text-red-700",
};

export default function PurchaseReturnRecordsPage() {
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = () => {
    fetch("/api/purchase/returns")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setReturns(d.data);
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

  const formatDateTime = (timestamp: number | null) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  const filteredReturns = returns.filter((ret) => {
    const matchSearch = !searchTerm || 
      ret.returnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除该退货记录吗？")) return;
    try {
      const res = await fetch(`/api/purchase/returns/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setReturns(returns.filter((r) => r.id !== id));
      } else {
        alert(data.error || "删除失败");
      }
    } catch {
      alert("删除失败");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4">
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
        <h1 className="text-xl font-semibold text-gray-900">采购退货记录</h1>
        <Link href="/purchase/returns" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          退货管理
        </Link>
      </div>

      {/* 搜索 */}
      <input
        type="text"
        placeholder="搜索退货单号、供应商..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="input w-full"
      />

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="px-4 py-3 text-left text-sm font-medium w-12">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium">退货单号</th>
                <th className="px-4 py-3 text-left text-sm font-medium">供应商</th>
                <th className="px-4 py-3 text-left text-sm font-medium">申请人</th>
                <th className="px-4 py-3 text-right text-sm font-medium">退货金额</th>
                <th className="px-4 py-3 text-center text-sm font-medium">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium">申请时间</th>
                <th className="px-4 py-3 text-center text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReturns.map((ret, index) => (
                <tr key={ret.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">
                    <Link href={`/purchase/returns/${ret.id}`}>{ret.returnNo}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{ret.supplierName}</td>
                  <td className="px-4 py-3 text-sm">{ret.operatorName}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    ¥{ret.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[ret.status]}`}>
                      {ret.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(ret.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <Link href={`/purchase/returns/${ret.id}`} className="text-blue-600 hover:text-blue-700 text-sm">
                        详情
                      </Link>
                      <button
                        onClick={() => handleDelete(ret.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">暂无退货记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
