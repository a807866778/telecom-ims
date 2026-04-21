"use client";

import { useState } from "react";
import { createSupplier } from "./actions";
import { useRouter } from "next/navigation";

export function SupplierForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const result = await createSupplier(null, formData);
      if (result?.error) { setError(result.error); setLoading(false); return; }
      router.push("/suppliers");
      router.refresh();
    } catch { setError("保存失败"); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
      <div>
        <label className="label">供应商名称 *</label>
        <input type="text" name="name" className="input" placeholder="如：杭州华光光缆有限公司" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">联系人</label>
          <input type="text" name="contactPerson" className="input" placeholder="张经理" />
        </div>
        <div>
          <label className="label">联系电话</label>
          <input type="tel" name="phone" className="input" placeholder="138-xxxx-xxxx" />
        </div>
      </div>
      <div>
        <label className="label">地址</label>
        <input type="text" name="address" className="input" placeholder="详细地址" />
      </div>
      <div>
        <label className="label">备注</label>
        <textarea name="remark" className="input" rows={3} placeholder="可选备注" />
      </div>
      <div className="flex gap-3 pt-4">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? "保存中..." : "保存"}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">取消</button>
      </div>
    </form>
  );
}
