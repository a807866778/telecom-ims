"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
}

interface Material {
  id: string;
  name: string;
  spec: string;
  unit: string;
  stock_quantity: number;
  sale_price: number;
}

interface Item {
  materialId: string;
  materialName: string;
  spec: string;
  unit: string;
  quantity: number;
  price: number;
}

export default function NewOutboundPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");

  useEffect(() => {
    Promise.all([
      fetch("/api/outbound?type=projects").then(r => r.json()),
      fetch("/api/outbound?type=materials").then(r => r.json()),
    ]).then(([projectsData, materialsData]) => {
      if (projectsData.success) setProjects(projectsData.data);
      if (materialsData.success) setMaterials(materialsData.data);
      setLoading(false);
    });
  }, []);

  const addItem = () => {
    if (!selectedMaterial) return;
    const material = materials.find(m => m.id === selectedMaterial);
    if (!material) return;

    setItems([...items, {
      materialId: material.id,
      materialName: material.name,
      spec: material.spec || "",
      unit: material.unit,
      quantity: parseInt(itemQuantity) || 1,
      price: material.sale_price || 0,
    }]);
    setSelectedMaterial("");
    setItemQuantity("1");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("请添加至少一个物料");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch("/api/outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: projectId || null,
        items: items.map(i => ({ materialId: i.materialId, quantity: i.quantity, price: i.price })),
        notes: notes || null,
      }),
    });

    const data = await res.json();
    if (data.success) {
      router.push("/outbound");
    } else {
      setError(data.error);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">新建出库单</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">项目</label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">请选择项目</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">出库物料</h2>

          <div className="flex gap-2">
            <select
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
            >
              <option value="">选择物料</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name} {m.spec && `(${m.spec})`} 库存:{m.stock_quantity}</option>)}
            </select>
            <input
              type="number"
              placeholder="数量"
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg"
              value={itemQuantity}
              onChange={(e) => setItemQuantity(e.target.value)}
            />
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              添加
            </button>
          </div>

          {items.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">物料</th>
                  <th className="py-2 text-right">数量</th>
                  <th className="py-2 text-right">单价</th>
                  <th className="py-2 text-right">小计</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{item.materialName} {item.spec && `(${item.spec})`}</td>
                    <td className="py-2 text-right">{item.quantity} {item.unit}</td>
                    <td className="py-2 text-right">¥{item.price.toFixed(2)}</td>
                    <td className="py-2 text-right font-mono">¥{(item.quantity * item.price).toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-2 text-right font-medium">总计:</td>
                  <td className="py-2 text-right font-mono font-bold">¥{totalAmount.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-400">暂无物料，请添加</div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存出库单"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
