"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Material {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  spec: string | null;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stockQuantity: number;
  minStockWarning: number;
  isLowStock: boolean;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/materials")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMaterials(d.data);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4">
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
        <h1 className="text-xl font-semibold text-gray-900">物料管理</h1>
        <Link href="/materials/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 添加物料
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">物料名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">分类</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">规格型号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">单位</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">采购价</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">结算价</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">库存</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materials.map((material) => (
                <tr key={material.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{material.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{material.categoryName}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{material.spec || "-"}</td>
                  <td className="px-4 py-3 text-sm">{material.unit}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">¥{material.purchasePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-green-600">¥{material.salePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-mono ${material.isLowStock ? "text-orange-600 font-bold" : "text-gray-900"}`}>
                      {material.stockQuantity}
                    </span>
                    <span className="text-gray-400 ml-1">{material.unit}</span>
                    {material.isLowStock && <span className="ml-2 text-xs text-orange-500">⚠️</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/materials/${material.id}`} className="text-blue-600 hover:text-blue-700">
                      详情
                    </Link>
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    暂无物料，<Link href="/materials/new" className="text-blue-600">添加第一个物料</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
