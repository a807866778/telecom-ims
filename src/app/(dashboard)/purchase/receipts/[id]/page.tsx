"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReceiptItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
}

interface Receipt {
  id: string;
  receiptNo: string;
  orderId: string | null;
  orderNo: string;
  supplierId: string | null;
  supplierName: string;
  operatorId: string | null;
  operatorName: string;
  totalAmount: number;
  remark: string | null;
  photoUrl: string | null;
  items: ReceiptItem[];
  createdAt: number;
}

export default function PurchaseReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/purchase/receipts/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setReceipt(d.data);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [id]);

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="card p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-xl">
          加载失败: {error || "收货单不存在"}
        </div>
        <button onClick={() => router.push("/purchase/receipts")} className="text-blue-600 hover:text-blue-700">
          ← 返回收货列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <Link href="/purchase/receipts" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← 返回收货列表
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">收货单详情</h1>
          <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
            已完成
          </span>
        </div>
        <p className="text-sm text-gray-500 font-mono mt-1">单号: {receipt.receiptNo}</p>
      </div>

      {/* 基本信息 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 border-b pb-3 mb-4">收货信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">收货单号</div>
            <div className="font-mono text-gray-900">{receipt.receiptNo}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">关联订单</div>
            <div className="text-gray-900">
              {receipt.orderNo === "无" ? (
                <span className="text-gray-400">无</span>
              ) : (
                <Link href={`/purchase/orders/${receipt.orderId}`} className="text-blue-600 hover:text-blue-700 font-mono">
                  {receipt.orderNo}
                </Link>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">供应商</div>
            <div className="text-gray-900">{receipt.supplierName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">操作员</div>
            <div className="text-gray-900">{receipt.operatorName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">收货时间</div>
            <div className="text-gray-900">{formatDateTime(receipt.createdAt)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">收货金额</div>
            <div className="text-xl font-bold text-green-600 font-mono">
              ¥{receipt.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        {receipt.remark && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500 mb-1">备注</div>
            <div className="text-gray-900">{receipt.remark}</div>
          </div>
        )}
      </div>

      {/* 到货照片 */}
      {receipt.photoUrl && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-3 mb-4">到货照片</h2>
          <div className="flex flex-wrap gap-3">
            {receipt.photoUrl.split(",").filter(Boolean).map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`到货照片 ${index + 1}`}
                className="w-32 h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                onClick={() => setViewPhoto(url)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 收货物料明细 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-800 border-b pb-3 mb-4">
          收货物料明细 ({receipt.items.length}种)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="px-4 py-3 text-left text-sm font-medium w-12">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium">物料名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium">规格</th>
                <th className="px-4 py-3 text-right text-sm font-medium">数量</th>
                <th className="px-4 py-3 text-right text-sm font-medium">单价</th>
                <th className="px-4 py-3 text-right text-sm font-medium">小计</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipt.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.materialName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.materialSpec || "-"}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    ¥{item.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-green-600">
                    ¥{(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={5} className="px-4 py-3 text-right">合计</td>
                <td className="px-4 py-3 text-right font-mono text-green-600 text-lg">
                  ¥{receipt.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 照片查看弹窗 */}
      {viewPhoto && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setViewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] mx-4">
            <img
              src={viewPhoto}
              alt="查看照片"
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setViewPhoto(null)}
              className="absolute -top-4 -right-4 w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700"
            >
              x
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
