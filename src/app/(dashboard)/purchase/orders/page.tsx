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

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch("/api/purchase/orders")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOrders(d.data);
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

  const formatDateTime = (timestamp: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  const filteredOrders = orders.filter((order) => {
    const matchSearch = !searchTerm || 
      order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除该订单吗？")) return;
    try {
      const res = await fetch(`/api/purchase/orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setOrders(orders.filter((o) => o.id !== id));
      } else {
        alert(data.error || "删除失败");
      }
    } catch (err) {
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
        <h1 className="text-xl font-semibold text-gray-900">采购订单</h1>
        <Link href="/purchase/orders/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 新建采购订单
        </Link>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="搜索订单号、供应商..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-40"
        >
          <option value="">全部状态</option>
          <option value="待收货">待收货</option>
          <option value="部分收货">部分收货</option>
          <option value="已完成">已完成</option>
          <option value="已取消">已取消</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="px-4 py-3 text-left text-sm font-medium w-12">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium">订单号</th>
                <th className="px-4 py-3 text-left text-sm font-medium">供应商</th>
                <th className="px-4 py-3 text-left text-sm font-medium">操作员</th>
                <th className="px-4 py-3 text-right text-sm font-medium">总金额</th>
                <th className="px-4 py-3 text-center text-sm font-medium">物料数</th>
                <th className="px-4 py-3 text-center text-sm font-medium">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium">创建时间</th>
                <th className="px-4 py-3 text-center text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order, index) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">
                    <Link href={`/purchase/orders/${order.id}`}>{order.orderNo}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{order.supplierName}</td>
                  <td className="px-4 py-3 text-sm">{order.operatorName}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    ¥{order.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{order.itemCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(order.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <Link href={`/purchase/orders/${order.id}`} className="text-blue-600 hover:text-blue-700 text-sm">
                        详情
                      </Link>
                      {order.status === "待收货" && (
                        <>
                          <Link href={`/purchase/orders/${order.id}/edit`} className="text-green-600 hover:text-green-700 text-sm">
                            编辑
                          </Link>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">暂无采购订单</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
