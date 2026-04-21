"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface InventoryItem {
  id: string;
  name: string;
  spec: string | null;
  unit: string;
  stockQuantity: number;
  minStockWarning: number;
  purchasePrice: number;
  salePrice: number;
  categoryId: string | null;
  categoryName: string | null;
  isLowStock: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchInventory();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      console.error("获取分类失败:", err);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);

      const res = await fetch(`/api/warehouse/inventory?${params}`);
      const data = await res.json();
      if (data.success) {
        setInventory(data.data || []);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchInventory();
  };

  const handleExport = () => {
    if (inventory.length === 0) {
      alert("暂无数据可导出");
      return;
    }

    // 转换数据为Excel格式
    const exportData = inventory.map((item) => ({
      "物料名称": item.name,
      "分类": item.categoryName || "",
      "规格型号": item.spec || "",
      "单位": item.unit,
      "当前库存": item.stockQuantity,
      "预警值": item.minStockWarning,
      "采购价": item.purchasePrice,
      "结算价": item.salePrice,
      "状态": item.isLowStock ? "库存不足" : "正常",
    }));

    // 创建工作簿和工作表
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "库存数据");

    // 设置列宽
    ws["!cols"] = [
      { wch: 20 }, // 物料名称
      { wch: 12 }, // 分类
      { wch: 20 }, // 规格型号
      { wch: 8 },  // 单位
      { wch: 12 }, // 当前库存
      { wch: 10 }, // 预警值
      { wch: 12 }, // 采购价
      { wch: 12 }, // 结算价
      { wch: 10 }, // 状态
    ];

    // 生成文件名（包含日期）
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `库存查询_${dateStr}.xlsx`;

    // 触发下载
    XLSX.writeFile(wb, fileName);
  };

  const lowStockCount = inventory.filter((item) => item.isLowStock).length;

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
        <h1 className="text-xl font-semibold text-gray-900">库存查询</h1>
        <div className="flex gap-3 items-center">
          {lowStockCount > 0 && (
            <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm">
              ⚠️ {lowStockCount} 个物料库存不足
            </div>
          )}
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出Excel
          </button>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索物料名称或规格..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-48">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            查询
          </button>
        </div>
      </div>

      {/* 库存表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-4 py-3 text-left text-sm font-medium">物料名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium">分类</th>
                <th className="px-4 py-3 text-left text-sm font-medium">规格型号</th>
                <th className="px-4 py-3 text-left text-sm font-medium">单位</th>
                <th className="px-4 py-3 text-right text-sm font-medium">当前库存</th>
                <th className="px-4 py-3 text-right text-sm font-medium">预警值</th>
                <th className="px-4 py-3 text-right text-sm font-medium">采购价</th>
                <th className="px-4 py-3 text-right text-sm font-medium">结算价</th>
                <th className="px-4 py-3 text-center text-sm font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{item.categoryName || "-"}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.spec || "-"}</td>
                  <td className="px-4 py-3 text-sm">{item.unit}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-mono font-medium ${item.isLowStock ? "text-red-600" : "text-gray-900"}`}>
                      {item.stockQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">{item.minStockWarning}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">¥{item.purchasePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-green-600">¥{item.salePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    {item.isLowStock ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        库存不足
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        正常
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    暂无库存数据
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
