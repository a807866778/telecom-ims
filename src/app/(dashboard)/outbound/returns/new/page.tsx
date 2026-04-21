"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OutboundOption {
  id: string;
  project_name: string;
  created_at: number;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface Material {
  id: string;
  name: string;
  spec: string | null;
  unit: string;
  stock_quantity: number;
  purchase_price: number;
}

interface ReturnItem {
  materialId: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  quantity: number;
  price: number;
}

export default function NewReturnPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [outbounds, setOutbounds] = useState<OutboundOption[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [projectId, setProjectId] = useState("");
  const [outboundId, setOutboundId] = useState("");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/outbound/returns?type=projects").then(r => r.json()),
      fetch("/api/outbound/returns?type=outbounds").then(r => r.json()),
      fetch("/api/outbound/returns?type=materials").then(r => r.json()),
    ]).then(([pData, oData, mData]) => {
      if (pData.success) setProjects(pData.data);
      if (oData.success) setOutbounds(oData.data);
      if (mData.success) setMaterials(mData.data);
      setLoading(false);
    }).catch(err => {
      setError(String(err));
      setLoading(false);
    });
  }, []);

  const handleAddItem = (material: Material) => {
    if (items.some(i => i.materialId === material.id)) {
      return;
    }
    setItems([...items, {
      materialId: material.id,
      materialName: material.name,
      materialSpec: material.spec || "",
      unit: material.unit,
      quantity: 1,
      price: material.purchase_price,
    }]);
  };

  const handleRemoveItem = (materialId: string) => {
    setItems(items.filter(i => i.materialId !== materialId));
  };

  const handleQuantityChange = (materialId: string, quantity: number) => {
    setItems(items.map(i =>
      i.materialId === materialId ? { ...i, quantity: Math.max(0.01, quantity) } : i
    ));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError("请添加至少一个退库物料");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/outbound/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || null,
          outboundId: outboundId || null,
          items: items.map(i => ({
            materialId: i.materialId,
            quantity: i.quantity,
            price: i.price,
          })),
          remark: remark || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/outbound/returns");
      } else {
        setError(data.error || "提交失败");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          ← 返回
        </button>
        <h1 className="text-xl font-semibold text-gray-900">新建退库单</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左侧：基础信息 */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">退库信息</h2>

          <div>
            <label className="label">关联项目</label>
            <select
              className="input"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">选择项目（可选）</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">关联原出库单</label>
            <select
              className="input"
              value={outboundId}
              onChange={e => setOutboundId(e.target.value)}
            >
              <option value="">选择出库单（可选）</option>
              {outbounds.map(o => (
                <option key={o.id} value={o.id}>
                  {o.id.slice(0, 8)} - {o.project_name || "无项目"} ({new Date(o.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">备注</label>
            <textarea
              className="input"
              rows={3}
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="退库原因等..."
            />
          </div>
        </div>

        {/* 中间：物料选择 */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-4">选择退库物料</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {materials.map(m => (
              <div
                key={m.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  items.some(i => i.materialId === m.id)
                    ? "bg-blue-50 border-blue-300"
                    : "bg-gray-50 border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => handleAddItem(m)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{m.name}</div>
                    <div className="text-sm text-gray-500">{m.spec} · {m.unit}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">¥{m.purchase_price}</div>
                    <div className="text-xs text-gray-400">库存: {m.stock_quantity}</div>
                  </div>
                </div>
              </div>
            ))}
            {materials.length === 0 && (
              <div className="text-center py-8 text-gray-400">暂无物料数据</div>
            )}
          </div>
        </div>

        {/* 右侧：退库明细 */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-4">退库明细</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {items.map(item => (
              <div key={item.materialId} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{item.materialName}</div>
                    <div className="text-xs text-gray-500">{item.materialSpec}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.materialId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input flex-1"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={e => handleQuantityChange(item.materialId, parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-sm text-gray-500">{item.unit}</span>
                  <span className="text-sm font-mono text-gray-700">
                    ¥{(item.quantity * item.price).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8 text-gray-400">点击左侧物料添加退库</div>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>退库总金额</span>
                <span className="text-green-600 font-mono">¥{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={submitting}
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          className="btn-primary"
          disabled={submitting || items.length === 0}
        >
          {submitting ? "提交中..." : "确认退库"}
        </button>
      </div>
    </div>
  );
}
