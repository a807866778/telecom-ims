"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface ReceiptItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

interface Receipt {
  id: string;
  receiptNo: string;
  orderId: string | null;
  orderNo: string;
  operatorId: string | null;
  operatorName: string;
  totalAmount: number;
  remark: string | null;
  photoUrl: string | null;
  itemCount: number;
  items: ReceiptItem[];
  createdAt: number;
}

interface Order {
  id: string;
  order_no: string;
  total_amount: number;
  status: string;
  supplier_name: string;
}

interface CurrentUser {
  id: string;
  realName: string;
}

export default function PurchaseReceiptsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  // 表单状态
  const [selectedOrderId, setSelectedOrderId] = useState(orderIdParam || "");
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 获取当前登录用户
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.hasCookie && d.user) {
          setCurrentUser(d.user);
        }
      })
      .catch(() => {});
    fetchReceipts();
  }, []);

  useEffect(() => {
    if (orderIdParam) {
      fetchOrderDetails(orderIdParam);
      setShowForm(true);
    }
  }, [orderIdParam]);

  const fetchReceipts = () => {
    fetch("/api/purchase/receipts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setReceipts(d.data);
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

  const fetchOrders = () => {
    fetch("/api/purchase/returns?type=orders")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrders(d.data);
      });
  };

  const fetchOrderDetails = (id: string) => {
    fetch(`/api/purchase/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const order = d.data;
          const pendingItems = order.items.filter(
            (item: any) => item.receivedQuantity < item.quantity
          );
          setOrderItems(pendingItems);
          setReceiptItems(
            pendingItems.map((i: any) => ({
              materialId: i.materialId,
              materialName: i.materialName,
              materialSpec: i.materialSpec,
              unit: i.unit,
              quantity: i.quantity - i.receivedQuantity,
              unitPrice: i.unitPrice,
            }))
          );
        }
      });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  const totalAmount = receiptItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const handleOrderChange = (id: string) => {
    setSelectedOrderId(id);
    if (id) {
      fetchOrderDetails(id);
    } else {
      setOrderItems([]);
      setReceiptItems([]);
    }
  };

  function updateReceiptItem(index: number, field: keyof ReceiptItem, value: number) {
    const newItems = [...receiptItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setReceiptItems(newItems);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
          setReceiptPhotos(prev => [...prev, data.url]);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (receiptItems.length === 0) {
      alert("请选择要收货的物料");
      return;
    }
    setSaving(true);

    try {
      const res = await fetch("/api/purchase/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId || null,
          items: receiptItems.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          remark,
          photoUrl: receiptPhotos.join(","),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setReceiptPhotos([]);
        fetchReceipts();
        router.push("/purchase/receipts");
      } else {
        alert(data.error || "保存失败");
      }
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  }

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

  if (showForm) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">采购收货</h1>
          <p className="text-sm text-gray-500 mt-1">确认采购订单的到货情况</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-medium text-gray-800 border-b pb-2">基本信息</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">关联采购订单</label>
                <select
                  className="input"
                  value={selectedOrderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                >
                  <option value="">请选择订单（可选）</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_no} - {o.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">备注</label>
                <input
                  type="text"
                  className="input"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="可选备注"
                />
              </div>
            </div>
          </div>

          {/* 到货照片 */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-medium text-gray-800 border-b pb-2">到货照片</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="flex flex-wrap gap-3">
                {receiptPhotos.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt={`到货照片${idx + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                      onClick={() => setViewPhoto(url)}
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptPhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      x
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-colors">
                  {uploading ? (
                    <span className="text-sm text-gray-400">上传中...</span>
                  ) : (
                    <>
                      <span className="text-2xl text-gray-400">+</span>
                      <span className="text-xs text-gray-400 mt-1">添加照片</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-2">点击照片可查看大图，支持 JPG、PNG、GIF、WebP 格式</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-medium text-gray-800 border-b pb-2">
              收货物料 ({receiptItems.length}种)
            </h2>

            <div className="space-y-3">
              {receiptItems.map((item, index) => (
                <div key={index} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">{item.materialName}</div>
                    <div className="text-xs text-gray-500">
                      {item.materialSpec || "-"} / 单价: ¥{item.unitPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      className="input text-right font-mono"
                      value={item.quantity}
                      onChange={(e) => updateReceiptItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      min="0.01"
                      step="0.01"
                      placeholder="收货数量"
                      required
                    />
                    <div className="text-xs text-gray-400 text-right mt-1">{item.unit}</div>
                  </div>
                  <div className="w-28 text-right font-mono text-sm">
                    ¥{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {receiptItems.length === 0 && (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                暂无物料数据
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <div className="text-right">
                <div className="text-sm text-gray-500">收货总金额</div>
                <div className="text-2xl font-bold text-green-600 font-mono">
                  ¥{totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || receiptItems.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "确认收货"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setReceiptPhotos([]);
                router.push("/purchase/receipts");
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </form>

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">采购收货</h1>
        <button
          onClick={() => {
            fetchOrders();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + 新增收货
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="px-4 py-3 text-left text-sm font-medium w-12">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium">收货单号</th>
                <th className="px-4 py-3 text-left text-sm font-medium">关联订单</th>
                <th className="px-4 py-3 text-left text-sm font-medium">操作员</th>
                <th className="px-4 py-3 text-right text-sm font-medium">总金额</th>
                <th className="px-4 py-3 text-center text-sm font-medium">物料数</th>
                <th className="px-4 py-3 text-center text-sm font-medium">照片</th>
                <th className="px-4 py-3 text-left text-sm font-medium">收货时间</th>
                <th className="px-4 py-3 text-center text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.map((receipt, index) => (
                <tr key={receipt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{receipt.receiptNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{receipt.orderNo}</td>
                  <td className="px-4 py-3 text-sm">{receipt.operatorName}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    ¥{receipt.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{receipt.itemCount}</td>
                  <td className="px-4 py-3 text-center">
                    {receipt.photoUrl ? (
                      <div className="flex items-center justify-center gap-1">
                        {receipt.photoUrl.split(",").slice(0, 2).map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`照片${idx + 1}`}
                            className="w-8 h-8 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => setViewPhoto(url)}
                          />
                        ))}
                        {receipt.photoUrl.split(",").length > 2 && (
                          <span className="text-xs text-gray-400 ml-1">
                            +{receipt.photoUrl.split(",").length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">无</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(receipt.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/purchase/receipts/${receipt.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">暂无收货记录</td>
                </tr>
              )}
            </tbody>
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
