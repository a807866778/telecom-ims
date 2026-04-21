"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReturnItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

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
  items: ReturnItem[];
  createdAt: number;
  auditedAt: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  "待审核": "bg-yellow-100 text-yellow-700",
  "已审核": "bg-blue-100 text-blue-700",
  "已退货": "bg-green-100 text-green-700",
  "已拒绝": "bg-red-100 text-red-700",
};

export default function PurchaseReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [returnOrder, setReturnOrder] = useState<ReturnOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returnId, setReturnId] = useState<string>("");

  useEffect(() => {
    params.then(p => setReturnId(p.id));
  }, [params]);

  useEffect(() => {
    if (!returnId) return;

    fetch(`/api/purchase/returns/${returnId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setReturnOrder(d.data);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [returnId]);

  const formatDateTime = (timestamp: number | null) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  const handleAudit = async (status: string) => {
    if (!confirm(`确定要${status === "已退货" ? "批准退货" : "拒绝退货"}吗？`)) return;
    
    try {
      const res = await fetch(`/api/purchase/returns/${returnId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          auditRemark: status === "已拒绝" ? "审核拒绝" : "审核通过",
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/purchase/returns");
      } else {
        alert(data.error || "操作失败");
      }
    } catch {
      alert("操作失败");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="card p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !returnOrder) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-xl">
          {error || "退货记录不存在"}
        </div>
        <Link href="/purchase/returns" className="text-blue-600 hover:text-blue-700">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">退货申请详情</h1>
            <span className={`px-2 py-1 rounded-full text-sm ${STATUS_COLORS[returnOrder.status]}`}>
              {returnOrder.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">退货单号: {returnOrder.returnNo}</p>
        </div>
        <div className="flex gap-2">
          {returnOrder.status === "待审核" && (
            <>
              <button
                onClick={() => handleAudit("已退货")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                批准退货
              </button>
              <button
                onClick={() => handleAudit("已拒绝")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                拒绝退货
              </button>
            </>
          )}
          <button
            onClick={() => router.push("/purchase/returns")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            返回列表
          </button>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 border-b pb-3 mb-4">基本信息</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">退货单号</div>
            <div className="font-mono text-gray-900">{returnOrder.returnNo}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">供应商</div>
            <div className="text-gray-900">{returnOrder.supplierName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">关联订单</div>
            <div className="text-gray-900">{returnOrder.orderNo}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">申请人</div>
            <div className="text-gray-900">{returnOrder.operatorName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">审核人</div>
            <div className="text-gray-900">{returnOrder.auditorName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">申请时间</div>
            <div className="text-gray-900">{formatDateTime(returnOrder.createdAt)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">退货金额</div>
            <div className="text-xl font-bold text-red-600 font-mono">
              ¥{returnOrder.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          {returnOrder.auditedAt && (
            <div>
              <div className="text-sm text-gray-500 mb-1">审核时间</div>
              <div className="text-gray-900">{formatDateTime(returnOrder.auditedAt)}</div>
            </div>
          )}
          {returnOrder.reason && (
            <div className="col-span-2">
              <div className="text-sm text-gray-500 mb-1">退货原因</div>
              <div className="text-gray-900">{returnOrder.reason}</div>
            </div>
          )}
          {returnOrder.auditRemark && (
            <div className="col-span-2">
              <div className="text-sm text-gray-500 mb-1">审核备注</div>
              <div className="text-gray-900">{returnOrder.auditRemark}</div>
            </div>
          )}
        </div>
      </div>

      {/* 照片 */}
      {returnOrder.photoUrl && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-3 mb-4">退货照片</h2>
          <div className="flex flex-wrap gap-3">
            {returnOrder.photoUrl.split(",").filter(Boolean).map((photo, index) => (
              <img
                key={index}
                src={`/api/media/${photo}`}
                alt={`退货照片 ${index + 1}`}
                className="w-40 h-40 object-cover rounded-lg border"
              />
            ))}
          </div>
        </div>
      )}

      {/* 物料明细 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 border-b pb-3 mb-4">
          退货物料明细 ({returnOrder.itemCount}种)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="px-4 py-3 text-left text-sm font-medium w-12">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium">物料名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium">规格</th>
                <th className="px-4 py-3 text-right text-sm font-medium">退货数量</th>
                <th className="px-4 py-3 text-right text-sm font-medium">单价</th>
                <th className="px-4 py-3 text-right text-sm font-medium">小计</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {returnOrder.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.materialName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.materialSpec || "-"}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    ¥{item.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-red-600">
                    ¥{(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={5} className="px-4 py-3 text-right font-medium">合计</td>
                <td className="px-4 py-3 text-right font-bold text-red-600 font-mono text-lg">
                  ¥{returnOrder.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
