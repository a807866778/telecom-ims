"use client";

import { useState } from "react";
import { createMaterial, updateMaterial } from "./actions";
import { useRouter } from "next/navigation";

interface MaterialFormProps {
  categories: { id: string; name: string }[];
  material?: {
    id: string;
    name: string;
    categoryId: string | null;
    unit: string;
    spec: string | null;
    purchasePrice: number;
    salePrice: number;
    stockQuantity: number;
    minStockWarning: number;
  };
}

export function MaterialForm({ categories, material }: MaterialFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      let result;
      if (material) {
        result = await updateMaterial(material.id, formData);
      } else {
        result = await createMaterial(formData);
      }
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError("保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="label">物料名称 *</label>
        <input
          type="text"
          name="name"
          className="input"
          defaultValue={material?.name || ""}
          placeholder="如：网络摄像机"
          required
        />
      </div>

      <div>
        <label className="label">分类</label>
        <select name="categoryId" className="input" defaultValue={material?.categoryId || ""}>
          <option value="">请选择分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">规格型号</label>
          <input type="text" name="spec" className="input" defaultValue={material?.spec || ""} placeholder="如：400万像素-枪机" />
        </div>
        <div>
          <label className="label">单位 *</label>
          <input type="text" name="unit" className="input" defaultValue={material?.unit || ""} placeholder="如：台、米、个" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">采购价 (元)</label>
          <input type="number" name="purchasePrice" step="0.01" min="0" className="input font-mono" defaultValue={material?.purchasePrice || ""} placeholder="0.00" />
        </div>
        <div>
          <label className="label">结算价 (元)</label>
          <input type="number" name="salePrice" step="0.01" min="0" className="input font-mono" defaultValue={material?.salePrice || ""} placeholder="0.00" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">当前库存</label>
          <input type="number" name="stockQuantity" step="0.01" min="0" className="input font-mono" defaultValue={material?.stockQuantity || ""} placeholder="0" />
        </div>
        <div>
          <label className="label">库存预警值</label>
          <input type="number" name="minStockWarning" step="0.01" min="0" className="input font-mono" defaultValue={material?.minStockWarning || ""} placeholder="低于此值提醒" />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "保存中..." : "保存"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">取消</button>
      </div>
    </form>
  );
}
