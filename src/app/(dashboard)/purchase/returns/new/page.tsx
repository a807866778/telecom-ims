"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Material {
  id: string;
  name: string;
  spec: string;
  unit: string;
  stock_quantity: number;
  purchase_price: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface Order {
  id: string;
  order_no: string;
  total_amount: number;
  status: string;
  supplier_name: string;
}

interface ReturnItem {
  materialId: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

interface PhotoItem {
  id: string;
  url: string;
  fileName: string;
}

export default function NewPurchaseReturnPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [orderItems, setOrderItems] = useState<ReturnItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/purchase/returns?type=suppliers").then(r => r.json()),
      fetch("/api/purchase/returns?type=orders").then(r => r.json()),
      fetch("/api/purchase/returns?type=materials").then(r => r.json()),
    ]).then(([suppliersData, ordersData, materialsData]) => {
      if (suppliersData.success) setSuppliers(suppliersData.data);
      if (ordersData.success) setOrders(ordersData.data);
      if (materialsData.success) setMaterials(materialsData.data);
    });
  }, []);

  const totalAmount = returnItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleOrderChange = async (orderId: string) => {
    setSelectedOrderId(orderId);
    if (orderId) {
      const res = await fetch(`/api/purchase/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        const order = data.data;
        setSelectedSupplierId(order.supplierId || "");
        setReturnItems(order.items.map((i: any) => ({
          materialId: i.materialId,
          materialName: i.materialName,
          materialSpec: i.materialSpec,
          unit: i.unit,
          quantity: i.receivedQuantity || i.quantity,
          unitPrice: i.unitPrice,
        })));
      }
    } else {
      setReturnItems([]);
    }
  };

  function addItem() {
    if (materials.length > 0) {
      const mat = materials[0];
      setReturnItems([...returnItems, {
        materialId: mat.id,
        materialName: mat.name,
        materialSpec: mat.spec || "",
        unit: mat.unit,
        quantity: 1,
        unitPrice: mat.purchase_price,
      }]);
    }
  }

  function removeItem(index: number) {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof ReturnItem, value: string | number) {
    const newItems = [...returnItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "materialId") {
      const material = materials.find((m) => m.id === value);
      if (material) {
        newItems[index].unitPrice = material.purchase_price;
        newItems[index].materialName = material.name;
        newItems[index].materialSpec = material.spec || "";
        newItems[index].unit = material.unit;
      }
    }
    setReturnItems(newItems);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          setPhotos([...photos, {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
            url: data.url,
            fileName: data.fileName,
          }]);
        } else {
          setError(data.error || "上传失败");
        }
      }
    } catch {
      setError("上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(id: string) {
    setPhotos(photos.filter(p => p.id !== id));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (returnItems.length === 0) { setError("请添加退货物料"); return; }
    if (!reason) { setError("请填写退货原因"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/purchase/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId || null,
          supplierId: selectedSupplierId || null,
          items: returnItems.map(item => ({
            materialId: item.materialId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          reason,
          photoUrl: photos.map(p => p.fileName).join(","),
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/purchase/returns");
      } else {
        setError(data.error || "保存失败");
        setLoading(false);
      }
    } catch {
      setError("保存失败");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">新建退货申请</h1>
        <p className="text-sm text-gray-500 mt-1">创建采购退货申请，等待审核</p>
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
              <label className="label">
                供应商 <span className="text-red-500">*</span>
              </label>
              <select
                className="input"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                required
              >
                <option value="">请选择供应商</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">
              退货原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细描述退货原因"
              rows={3}
              required
            />
          </div>
        </div>

        {/* 照片上传 */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">退货照片</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="flex flex-wrap gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img src={photo.url} alt="退货照片" className="w-24 h-24 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-red-400 hover:bg-gray-50 transition-colors">
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
          </div>
        </div>

        {/* 退货物料 */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-medium text-gray-800">退货物料</h2>
            <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700">
              + 添加物料
            </button>
          </div>

          <div className="space-y-3">
            {returnItems.map((item, index) => (
              <div key={index} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg">
                <div className="flex-1">
                  <select
                    className="input"
                    value={item.materialId}
                    onChange={(e) => updateItem(index, "materialId", e.target.value)}
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.spec && `(${m.spec})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    className="input text-right"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    min="0.01"
                    step="0.01"
                    placeholder="数量"
                    required
                  />
                  <div className="text-xs text-gray-400 text-right mt-1">{item.unit}</div>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    className="input text-right font-mono"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="单价"
                    required
                  />
                </div>
                <div className="w-28 text-right font-mono text-sm">
                  ¥{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  x
                </button>
              </div>
            ))}
          </div>

          {returnItems.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              暂无物料，点击上方&quot;添加物料&quot;添加
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <div className="text-sm text-gray-500">退货总金额</div>
              <div className="text-2xl font-bold text-red-600 font-mono">
                ¥{totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || uploading || returnItems.length === 0}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "提交中..." : "提交退货申请"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
