"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface ReturnItemDetail {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string;
  materialUnit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ReturnRecordDetail {
  id: string;
  outboundId: string;
  projectId: string;
  projectName: string;
  operatorId: string;
  operatorName: string;
  outboundCreatedAt: number;
  totalAmount: number;
  remark: string;
  createdAt: number;
  items: ReturnItemDetail[];
}

export default function ReturnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [record, setRecord] = useState<ReturnRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/outbound/returns/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setRecord(d.data);
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

  const handleDelete = async () => {
    if (!confirm("确定要删除此退库记录吗？库存将恢复。")) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/outbound/returns/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/outbound/returns");
      } else {
        setError(data.error || "删除失败");
        setDeleting(false);
      }
    } catch (err) {
      setError(String(err));
      setDeleting(false);
    }
  };

  const formatDateTime = (timestamp: number | null) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error || "记录不存在"}</div>
        <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700">
          ← 返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            ← 返回
          </button>
          <h1 className="text-xl font-semibold text-gray-900">退库单详情</h1>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          disabled={deleting}
        >
          {deleting ? "删除中..." : "删除记录"}
        </button>
      </div>

      {/* 基本信息 */}
      <div className="card p-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">退库单号</div>
            <div className="font-mono text-gray-900">{record.id.slice(0, 8)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">关联项目</div>
            <div className="text-gray-900">{record.projectName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">操作员</div>
            <div className="text-gray-900">{record.operatorName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">退库时间</div>
            <div className="text-gray-900">{formatDateTime(record.createdAt)}</div>
          </div>
        </div>

        {record.outboundId && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">原出库单号</div>
            <div className="font-mono text-gray-700">{record.outboundId.slice(0, 8)}</div>
            {record.outboundCreatedAt && (
              <div className="text-sm text-gray-400 mt-1">
                出库时间: {formatDateTime(record.outboundCreatedAt)}
              </div>
            )}
          </div>
        )}

        {record.remark && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">备注</div>
            <div className="text-gray-700">{record.remark}</div>
          </div>
        )}
      </div>

      {/* 退库明细 */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">退库物料</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">物料名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">规格</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">退库数量</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">单价</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">小计</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {record.items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.materialName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.materialSpec || "-"}</td>
                <td className="px-4 py-3 text-sm text-right font-mono">{item.quantity} {item.materialUnit}</td>
                <td className="px-4 py-3 text-sm text-right font-mono">¥{item.unitPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right font-mono font-semibold">¥{item.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-900">退库总金额</td>
              <td className="px-4 py-3 text-right font-mono text-lg font-bold text-green-600">
                ¥{record.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
