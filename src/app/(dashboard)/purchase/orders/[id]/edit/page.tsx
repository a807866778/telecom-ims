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

interface OrderItem {
  id?: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity?: number;
}

interface PhotoItem {
  id: string;
  url: string;
  fileName: string;
}

export default function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string>("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    params.then(p => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (!orderId) return;

    // 获取供应商和物料列表
    Promise.all([
      fetch("/api/purchase/orders?type=suppliers").then(r => r.json()),
      fetch("/api/purchase/orders?type=materials").then(r => r.json()),
      fetch(`/api/purchase/orders/${orderId}`).then(r => r.json()),
    ]).then(([suppliersData, materialsData, orderData]) => {
      if (suppliersData.success) setSuppliers(suppliersData.data);
      if (materialsData.success) setMaterials(materialsData.data);
      if (orderData.success) {
        const order = orderData.data;
        setSupplierId(order.supplierId || "");
        setExpectedDate(order.expectedDate ? new Date(order.expectedDate).toISOString().split("T")[0] : "");
        setRemark(order.remark || "");
        setItems(order.items.map((i: any) => ({
          id: i.id,
          materialId: i.materialId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          receivedQuantity: i.receivedQuantity,
        })));
        if (order.photoUrl) {
          setPhotos(order.photoUrl.split(",").filter(Boolean).map((f: string, idx: number) => ({
            id: `${idx}`,
            url: `/api/media/${f}`,
            fileName: f,
          })));
        }
      }
      setLoading(false);
    });
  }, [orderId]);

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  function addItem() {
    setItems([...items, { materialId: materials[0]?.id || "", quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "materialId") {
      const material = materials.find((m) => m.id === value);
      if (material) {
        newItems[index].unitPrice = material.purchase_price;
      }
    }
    setItems(newItems);
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
    if (!supplierId) { setError("请选择供应商"); return; }
    if (items.length === 0) { setError("请添加采购物料"); return; }
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/purchase/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          expectedDate: expectedDate ? new Date(expectedDate).getTime() : null,
          remark,
          items,
          photoUrl: photos.map(p => p.fileName).join(","),
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/purchase/orders/${orderId}`);
      } else {
        setError(data.error || "保存失败");
        setSaving(false);
      }
    } catch {
      setError("保存失败");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-6"></div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">编辑采购订单</h1>
        <p className="text-sm text-gray-500 mt-1">修改采购订单信息</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">基本信息</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                供应商 <span className="text-red-500">*</span>
              </label>
              <select
                className="input"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">请选择供应商</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">预计到货日期</label>
              <input
                type="date"
                className="input"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">备注</label>
            <input
              type="text"
              className="input"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="可选备注信息"
            />
          </div>
        </div>

        {/* 照片上传 */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-800 border-b pb-2">订单照片</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="flex flex-wrap gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img src={photo.url} alt="订单照片" className="w-24 h-24 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
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
          </div>
        </div>

        {/* 采购物料 */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-medium text-gray-800">采购物料</h2>
            <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700">
              + 添加物料
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const material = materials.find((m) => m.id === item.materialId);
              return (
                <div key={index} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <select
                      className="input"
                      value={item.materialId}
                      onChange={(e) => updateItem(index, "materialId", e.target.value)}
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.spec && `(${m.spec})`} - 库存: {m.stock_quantity}{m.unit}
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
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <div className="text-sm text-gray-500">订单总金额</div>
              <div className="text-2xl font-bold text-blue-600 font-mono">
                ¥{totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || uploading || items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存修改"}
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
