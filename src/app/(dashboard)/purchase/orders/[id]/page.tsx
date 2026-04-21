"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
}

interface Order {
  id: string;
  orderNo: string;
  supplierId: string | null;
  supplierName: string;
  operatorId: string | null;
  operatorName: string;
  totalAmount: number;
  status: string;
  expectedDate: number | null;
  remark: string | null;
  photoUrl: string | null;
  itemCount: number;
  items: OrderItem[];
  createdAt: number;
  updatedAt: number;
}

const STATUS_COLORS: Record<string, string> = {
  "待收货": "bg-yellow-100 text-yellow-700",
  "部分收货": "bg-blue-100 text-blue-700",
  "已完成": "bg-green-100 text-green-700",
  "已取消": "bg-gray-100 text-gray-500",
};

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string>("");

  useEffect(() => {
    params.then(p => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (!orderId) return;

    fetch(`/api/purchase/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOrder(d.data);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [orderId]);

  const formatDateTime = (timestamp: number | null) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("zh-CN");
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

  if (error || !order) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-xl">
          {error || "订单不存在"}
        </div>
        <Link href="/purchase/orders" className="text-blue-600 hover:text-blue-700">
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
            <h1 className="text-xl font-semibold text-gray-900">采购订单详情</h1>
            <span className={`px-2 py-1 rounded-full text-sm ${STATUS_COLORS[order.status]}`}>
              {order.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">订单号: {order.orderNo}</p>
        </div>
        <div className="flex gap-2">
          {order.status === "待收货" && (
            <>
              <Link
                href={`/purchase/receipts?orderId=${order.id}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                确认收货
              </Link>
              <Link
                href={`/purchase/orders/${order.id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                编辑订单
              </Link>
            </>
          )}
          <button
            onClick={() => router.push("/purchase/orders")}
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
            <div className="text-sm text-gray-500 mb-1">订单号</div>
            <div className="font-mono text-gray-900">{order.orderNo}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">供应商</div>
            <div className="text-gray-900">{order.supplierName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">操作员</div>
            <div className="text-gray-900">{order.operatorName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">预计到货日期</div>
            <div className="text-gray-900">{formatDateTime(order.expectedDate)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">订单金额</div>
            <div className="text-xl font-bold text-blue-600 font-mono">
              ¥{order.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">创建时间</div>
            <div className="text-gray-900">{formatDateTime(order.createdAt)}</div>
          </div>
          {order.remark && (
            <div className="col-span-2">
              <div className="text-sm text-gray-500 mb-1">备注</div>
              <div className="text-gray-900">{order.remark}</div>
            </div>
          )}
        </div>
      </div>

      {/* 照片 */}
      {order.photoUrl && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-3 mb-4">订单照片</h2>
          <div className="flex flex-wrap gap-3">
            {order.photoUrl.split(",").filter(Boolean).map((photo, index) => (
              <img
                key={index}
                src={`/api/media/${photo}`}
                alt={`订单照片 ${index + 1}`}
                className="w-40 h-40 object-cover rounded-lg border"
              />
            ))}
          </div>
        </div>
      )}

      {/* 物料明细 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 border-b pb-3 mb-4">
          物料明细 ({order.itemCount}种)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="px-4 py-3 text-left text-sm font-medium w-12">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium">物料名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium">规格</th>
                <th className="px-4 py-3 text-right text-sm font-medium">采购数量</th>
                <th className="px-4 py-3 text-right text-sm font-medium">已收货</th>
                <th className="px-4 py-3 text-right text-sm font-medium">单价</th>
                <th className="px-4 py-3 text-right text-sm font-medium">小计</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.materialName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.materialSpec || "-"}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono ${item.receivedQuantity >= item.quantity ? "text-green-600" : "text-yellow-600"}`}>
                      {item.receivedQuantity}
                    </span>
                    <span className="text-gray-400"> / {item.quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    ¥{item.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-blue-600">
                    ¥{(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={6} className="px-4 py-3 text-right font-medium">合计</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600 font-mono text-lg">
                  ¥{order.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
