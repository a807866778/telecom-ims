"use client";

import { useState } from "react";
import { createProject } from "./actions";
import { useRouter } from "next/navigation";

export function ProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const result = await createProject(null, formData);
      if (result?.error) { setError(result.error); setLoading(false); return; }
      router.push("/projects");
      router.refresh();
    } catch { setError("保存失败"); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
      <div>
        <label className="label">项目名称 *</label>
        <input type="text" name="name" className="input" placeholder="如：XX小区光纤改造工程" required />
      </div>
      <div>
        <label className="label">甲方名称</label>
        <input type="text" name="clientName" className="input" placeholder="如：XX物业管理有限公司" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">联系电话</label>
          <input type="tel" name="contactPhone" className="input" placeholder="138-xxxx-xxxx" />
        </div>
        <div>
          <label className="label">项目状态</label>
          <select name="status" className="input" defaultValue="进行中">
            <option value="进行中">进行中</option>
            <option value="已完成">已完成</option>
            <option value="已归档">已归档</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">项目地址</label>
        <input type="text" name="address" className="input" placeholder="详细地址" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">开始日期</label>
          <input type="date" name="startDate" className="input" />
        </div>
        <div>
          <label className="label">结束日期</label>
          <input type="date" name="endDate" className="input" />
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? "保存中..." : "创建项目"}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">取消</button>
      </div>
    </form>
  );
}
