"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface InboundItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string | null;
  unit: string;
  quantity: number;
  price: number;
}

export default function InboundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{
    record: { id: string; supplierId: string; supplierName: string; operatorName: string; totalAmount: number; notes: string | null; photoUrl: string | null; createdAt: number };
    items: InboundItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/inbound/${id}`)
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
          加载失败: {error || "入库记录不存在"}
        </div>
        <Link href="/inbound" className="text-blue-600 hover:text-blue-700">
          ← 返回入库列表
        </Link>
      </div>
    );
  }

  const { record, items } = data;

  return (
    <div className="space-y-6">
      {/* 返回按钮和标题 */}
      <div>
        <Link href="/inbound" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← 返回入库列表
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">入库单详情</h1>
        <p className="text-gray-500 font-mono text-sm">单号: {record.id}</p>
      </div>

      {/* 基本信息卡片 */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">入库信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-500">供应商</div>
            <div className="text-gray-900">{record.supplierName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">操作员</div>
            <div className="text-gray-900">{record.operatorName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">入库时间</div>
            <div className="text-gray-900">{new Date(record.createdAt).toLocaleString("zh-CN")}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">总金额</div>
            <div className="text-2xl font-bold text-green-600 font-mono">¥{record.totalAmount.toFixed(2)}</div>
          </div>
        </div>
        {record.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">备注</div>
            <div className="text-gray-900">{record.notes}</div>
          </div>
        )}
        {record.photoUrl && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">入库照片</div>
            <a href={record.photoUrl} target="_blank" rel="noopener noreferrer">
              <img src={record.photoUrl} alt="入库照片" className="mt-1 w-48 h-32 object-cover rounded-lg hover:opacity-80 transition-opacity" />
            </a>
          </div>
        )}
      </div>

      {/* 入库明细 */}
      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">入库物料 ({items.length}项)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left">物料名称</th>
                <th className="px-4 py-3 text-left">规格</th>
                <th className="px-4 py-3 text-right">数量</th>
                <th className="px-4 py-3 text-right">单价</th>
                <th className="px-4 py-3 text-right">小计</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.materialName}</td>
                  <td className="px-4 py-3 text-gray-500">{item.materialSpec || "-"}</td>
                  <td className="px-4 py-3 text-right font-mono">{item.quantity} {item.unit}</td>
                  <td className="px-4 py-3 text-right font-mono">¥{item.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-green-600">
                    ¥{(item.quantity * item.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="px-4 py-3 text-right">合计:</td>
                <td className="px-4 py-3 text-right font-mono text-green-600">¥{record.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
