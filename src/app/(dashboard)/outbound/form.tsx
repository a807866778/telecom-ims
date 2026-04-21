"use client";

import { useState } from "react";
import { createOutboundRecord } from "./actions";
import { useRouter } from "next/navigation";

interface OutboundFormProps {
  projects: { id: string; name: string; clientName: string | null }[];
  materials: {
    id: string; name: string; spec: string | null; unit: string; salePrice: number; stockQuantity: number;
  }[];
  operatorId: string;
}

interface OutboundItem {
  materialId: string;
  quantity: number;
  unitPrice: number;
}

export function OutboundForm({ projects, materials, operatorId }: OutboundFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<OutboundItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalCost = items.reduce((sum, item) => {
    const material = materials.find((m) => m.id === item.materialId);
    return sum + item.quantity * (material?.salePrice || 0);
  }, 0);
  const totalProfit = totalAmount - totalCost;

  function addItem() {
    setItems([...items, { materialId: materials[0]?.id || "", quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof OutboundItem, value: string | number) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "materialId") {
      const material = materials.find((m) => m.id === value);
      if (material) newItems[index].unitPrice = material.salePrice;
    }
    setItems(newItems);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId) { setError("请选择项目"); return; }
    if (items.length === 0) { setError("请添加出库物料"); return; }
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("remark", remark);
      formData.set("items", JSON.stringify(items));
      const result = await createOutboundRecord(null, formData);
      if (result?.error) { setError(result.error); setLoading(false); return; }
      router.push("/outbound");
      router.refresh();
    } catch { setError("保存失败"); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div>
        <label className="label">项目 *</label>
        <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
          <option value="">请选择项目</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name} {p.clientName && `- ${p.clientName}`}</option>)}
        </select>
      </div>

      <div>
        <label className="label">备注</label>
        <input type="text" className="input" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="可选" />
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="label mb-0">出库物料</label>
          <button type="button" onClick={addItem} className="text-sm text-primary-600 hover:text-primary-700">+ 添加物料</button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => {
            const material = materials.find((m) => m.id === item.materialId);
            return (
              <div key={index} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg">
                <div className="flex-1">
                  <select className="input" value={item.materialId} onChange={(e) => updateItem(index, "materialId", e.target.value)}>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name} {m.spec && `(${m.spec})`} - 库存: {m.stockQuantity}{m.unit}</option>)}
                  </select>
                </div>
                <div className="w-24">
                  <input type="number" className="input text-right" value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)} min="0.01" step="0.01" placeholder="数量" required />
                </div>
                <div className="w-32">
                  <input type="number" className="input text-right font-mono" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)} min="0" step="0.01" placeholder="单价" required />
                </div>
                <div className="w-28 text-right font-mono text-sm">¥{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</div>
                <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2">✕</button>
              </div>
            );
          })}
        </div>
        {items.length === 0 && <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">暂无物料，点击上方"添加物料"添加</div>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-primary-50 p-4 rounded-lg text-center">
          <div className="text-sm text-primary-600">结算产值</div>
          <div className="text-xl font-bold text-primary-700 font-mono">¥{totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <div className="text-sm text-orange-600">成本</div>
          <div className="text-xl font-bold text-orange-700 font-mono">¥{totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-sm text-green-600">利润</div>
          <div className="text-xl font-bold text-green-700 font-mono">¥{totalProfit.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading || items.length === 0} className="btn-primary">{loading ? "保存中..." : "确认出库"}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">取消</button>
      </div>
    </form>
  );
}
