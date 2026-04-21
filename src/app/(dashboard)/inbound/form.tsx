"use client";

import { useState, useRef } from "react";
import { createInboundRecord } from "./actions";
import { useRouter } from "next/navigation";

interface InboundFormProps {
  suppliers: { id: string; name: string }[];
  materials: {
    id: string; name: string; spec: string | null; unit: string; purchasePrice: number; stockQuantity: number;
  }[];
  operatorId: string;
}

interface InboundItem {
  materialId: string;
  quantity: number;
  unitPrice: number;
}

interface PhotoItem {
  id: string;
  url: string;
  fileName: string;
}

export function InboundForm({ suppliers, materials, operatorId }: InboundFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<InboundItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  function addItem() {
    setItems([...items, { materialId: materials[0]?.id || "", quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof InboundItem, value: string | number) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "materialId") {
      const material = materials.find((m) => m.id === value);
      if (material) newItems[index].unitPrice = material.purchasePrice;
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
    if (items.length === 0) { setError("请添加入库物料"); return; }
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("supplierId", supplierId);
      formData.set("remark", remark);
      formData.set("items", JSON.stringify(items));
      formData.set("photos", JSON.stringify(photos.map(p => p.fileName)));
      const result = await createInboundRecord(null, formData);
      if (result?.error) { setError(result.error); setLoading(false); return; }
      router.push("/inbound");
      router.refresh();
    } catch { setError("保存失败"); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">供应商</label>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">请选择供应商</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">备注</label>
          <input type="text" className="input" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="可选" />
        </div>
      </div>

      {/* 照片上传 */}
      <div>
        <label className="label">入库照片</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="flex flex-wrap gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img src={photo.url} alt="入库照片" className="w-24 h-24 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
            <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors">
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
          <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG、GIF、WebP 格式，最大 5MB</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="label mb-0">入库物料</label>
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

      <div className="flex justify-end">
        <div className="text-right">
          <div className="text-sm text-gray-500">总金额</div>
          <div className="text-2xl font-bold text-primary-600 font-mono">¥{totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading || uploading || items.length === 0} className="btn-primary">{loading ? "保存中..." : "确认入库"}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">取消</button>
      </div>
    </form>
  );
}
