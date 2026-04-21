"use client";

import { useState, useEffect } from "react";
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
  materialId: string;
  quantity: number;
  unitPrice: number;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 获取供应商和物料列表
    Promise.all([
      fetch("/api/purchase/orders?type=suppliers").then(r => r.json()),
      fetch("/api/purchase/orders?type=materials").then(r => r.json()),
    ]).then(([suppliersData, materialsData]) => {
      if (suppliersData.success) setSuppliers(suppliersData.data);
      if (materialsData.success) setMaterials(materialsData.data);
    });
  }, []);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supplierId) { setError("请选择供应商"); return; }
    if (items.length === 0) { setError("请添加采购物料"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/purchase/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          expectedDate: expectedDate ? new Date(expectedDate).getTime() : null,
          remark,
          items,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/purchase/orders");
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
        <h1 className="text-xl font-semibold text-gray-900">新建采购订单</h1>
        <p className="text-sm text-gray-500 mt-1">创建新的采购订单，关联供应商和采购物料</p>
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
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              暂无物料，点击上方&quot;添加物料&quot;添加
            </div>
          )}

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
            disabled={loading || items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "保存中..." : "创建订单"}
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
