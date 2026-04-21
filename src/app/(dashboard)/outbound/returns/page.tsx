"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReturnRecord {
  id: string;
  outboundId: string | null;
  projectId: string | null;
  projectName: string;
  operatorId: string | null;
  operatorName: string;
  outboundDate: number;
  totalAmount: number;
  itemCount: number;
  remark: string | null;
  createdAt: number;
}

export default function ReturnsPage() {
  const [records, setRecords] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/outbound/returns")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRecords(d.data);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  const formatDateTime = (timestamp: number | null) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("zh-CN");
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
        <h1 className="text-xl font-semibold text-gray-900">退库管理</h1>
        <Link href="/outbound/returns/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 新建退库单
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">退库单号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">原出库单</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">项目</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作员</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">退库金额</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">物料数</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">退库时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{record.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{record.outboundId?.slice(0, 8) || "-"}</td>
                  <td className="px-4 py-3 text-sm">{record.projectName}</td>
                  <td className="px-4 py-3 text-sm">{record.operatorName}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">¥{record.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm">{record.itemCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(record.createdAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/outbound/returns/${record.id}`} className="text-blue-600 hover:text-blue-700">
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">暂无退库记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
