"use client";

import { useEffect, useState } from "react";

interface Adjustment {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string | null;
  materialUnit: string;
  type: "overflow" | "loss";
  quantity: number;
  beforeStock: number;
  afterStock: number;
  reason: string | null;
  operatorId: string;
  operatorName: string;
  createdAt: number;
}

interface Material {
  id: string;
  name: string;
  spec: string | null;
  unit: string;
  stockQuantity: number;
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("");

  // 表单数据
  const [formData, setFormData] = useState({
    materialId: "",
    type: "overflow",
    quantity: "",
    reason: "",
  });

  useEffect(() => {
    fetchMaterials();
    fetchAdjustments();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch("/api/warehouse/inventory");
      const data = await res.json();
      if (data.success) {
        setMaterials(data.data || []);
      }
    } catch (err) {
      console.error("获取物料失败:", err);
    }
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);

      const res = await fetch(`/api/warehouse/adjustments?${params}`);
      const data = await res.json();
      if (data.success) {
        setAdjustments(data.data || []);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchAdjustments();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/warehouse/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: formData.materialId,
          type: formData.type,
          quantity: parseFloat(formData.quantity),
          reason: formData.reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setFormData({ materialId: "", type: "overflow", quantity: "", reason: "" });
        fetchAdjustments();
        fetchMaterials();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(String(err));
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selectedMaterial = materials.find((m) => m.id === formData.materialId);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="bg-white rounded-xl shadow-sm p-4">
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
        <h1 className="text-xl font-semibold text-gray-900">报溢报损</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 新增调整
        </button>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4 flex-wrap items-end">
          <div className="w-40">
            <label className="block text-sm text-gray-600 mb-1">调整类型</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="报溢">报溢</option>
              <option value="报损">报损</option>
            </select>
          </div>
          <button
            onClick={handleFilter}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            筛选
          </button>
        </div>
      </div>

      {/* 调整记录表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-4 py-3 text-left text-sm font-medium">调整时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium">物料名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium">规格</th>
                <th className="px-4 py-3 text-center text-sm font-medium">类型</th>
                <th className="px-4 py-3 text-right text-sm font-medium">调整数量</th>
                <th className="px-4 py-3 text-right text-sm font-medium">调整前</th>
                <th className="px-4 py-3 text-right text-sm font-medium">调整后</th>
                <th className="px-4 py-3 text-left text-sm font-medium">原因</th>
                <th className="px-4 py-3 text-left text-sm font-medium">操作员</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adjustments.map((adj) => (
                <tr key={adj.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(adj.createdAt)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{adj.materialName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{adj.materialSpec || "-"}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    {adj.type === "overflow" ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        报溢
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        报损
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {adj.type === "overflow" ? "+" : "-"}{adj.quantity} {adj.materialUnit}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-500">{adj.beforeStock}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-medium">{adj.afterStock}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{adj.reason || "-"}</td>
                  <td className="px-4 py-3 text-sm">{adj.operatorName}</td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    暂无调整记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增调整弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">新增库存调整</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">物料 *</label>
                <select
                  value={formData.materialId}
                  onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">请选择物料</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.spec || "无规格"}) - 当前库存: {m.stockQuantity} {m.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">调整类型 *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="overflow"
                      checked={formData.type === "overflow"}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>报溢 (+)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="loss"
                      checked={formData.type === "loss"}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>报损 (-)</span>
                  </label>
                </div>
              </div>

              {selectedMaterial && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="text-gray-600">
                    当前库存: <span className="font-medium text-gray-900">{selectedMaterial.stockQuantity} {selectedMaterial.unit}</span>
                  </div>
                  {formData.quantity && (
                    <div className="text-gray-600 mt-1">
                      调整后库存: <span className="font-medium text-gray-900">
                        {formData.type === "overflow"
                          ? selectedMaterial.stockQuantity + parseFloat(formData.quantity || "0")
                          : selectedMaterial.stockQuantity - parseFloat(formData.quantity || "0")
                        } {selectedMaterial.unit}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">调整数量 *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入调整数量"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">调整原因</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="请输入调整原因（可选）"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  确认调整
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
