"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface SupplierDetail {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: number;
}

interface InboundRecord {
  id: string;
  totalAmount: number;
  operatorName: string;
  notes: string | null;
  createdAt: number;
}

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ supplier: SupplierDetail; inboundRecords: InboundRecord[]; stats: { orderCount: number; totalAmount: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/suppliers?id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d.data);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-xl">
          加载失败: {error || "供应商不存在"}
        </div>
        <Link href="/suppliers" className="text-blue-600 hover:text-blue-700">
          ← 返回供应商列表
        </Link>
      </div>
    );
  }

  const { supplier, inboundRecords, stats } = data;

  return (
    <div className="space-y-6">
      {/* 供应商信息 */}
      <div className="flex justify-between items-start">
        <div>
          <Link href="/suppliers" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← 返回供应商列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">基本信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-500">联系人</div>
            <div className="text-gray-900">{supplier.contact || "-"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">联系电话</div>
            <div className="text-gray-900">{supplier.phone || "-"}</div>
          </div>
          <div className="col-span-2">
            <div className="text-sm text-gray-500">地址</div>
            <div className="text-gray-900">{supplier.address || "-"}</div>
          </div>
        </div>
        {supplier.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">备注</div>
            <div className="text-gray-900">{supplier.notes}</div>
          </div>
        )}
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 bg-blue-50">
          <div className="text-sm text-blue-600">入库次数</div>
          <div className="text-2xl font-bold text-blue-700 font-mono">{stats.orderCount}</div>
        </div>
        <div className="card p-4 bg-green-50">
          <div className="text-sm text-green-600">累计金额</div>
          <div className="text-2xl font-bold text-green-700 font-mono">¥{stats.totalAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* 入库记录 */}
      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">入库记录</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {inboundRecords.length > 0 ? (
            inboundRecords.map((record) => (
              <div key={record.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-mono text-sm text-gray-500">{record.id.slice(0, 8)}</div>
                  <div className="text-sm text-gray-500">
                    操作员: {record.operatorName} • {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                  {record.notes && <div className="text-xs text-gray-400">{record.notes}</div>}
                </div>
                <div className="text-right">
                  <div className="font-mono text-green-600">¥{record.totalAmount.toFixed(2)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">暂无入库记录</div>
          )}
        </div>
      </div>
    </div>
  );
}
