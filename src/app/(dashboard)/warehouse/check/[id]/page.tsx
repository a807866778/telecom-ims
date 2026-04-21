"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface CheckItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string | null;
  materialUnit: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  isAdjusted: boolean;
  remark: string | null;
}

interface StockCheck {
  id: string;
  checkMonth: string;
  status: "pending" | "completed";
  totalItems: number;
  diffItems: number;
  operatorId: string;
  operatorName: string;
  remark: string | null;
  createdAt: number;
  completedAt: number | null;
  items: CheckItem[];
}

export default function StockCheckDetailPage() {
  const params = useParams();
  const checkId = params.id as string;

  const [check, setCheck] = useState<StockCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingItems, setEditingItems] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCheckDetail();
  }, [checkId]);

  const fetchCheckDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/warehouse/check/${checkId}`);
      const data = await res.json();
      if (data.success) {
        setCheck(data.data);
        // 初始化编辑状态
        const initialEdits: Record<string, number> = {};
        data.data.items.forEach((item: CheckItem) => {
          initialEdits[item.id] = item.actualStock;
        });
        setEditingItems(initialEdits);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleActualStockChange = (itemId: string, value: string) => {
    setEditingItems({
      ...editingItems,
      [itemId]: parseFloat(value) || 0,
    });
  };

  const handleSaveItems = async () => {
    if (!check) return;

    setSaving(true);
    try {
      const itemsToUpdate = check.items.map((item) => ({
        id: item.id,
        actualStock: editingItems[item.id],
        difference: editingItems[item.id] - item.systemStock,
        remark: item.remark,
      }));

      const res = await fetch(`/api/warehouse/check/${checkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateItems", items: itemsToUpdate }),
      });

      const data = await res.json();
      if (data.success) {
        fetchCheckDetail();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm("确定要完成盘点吗？完成后将无法修改。")) return;

    try {
      const res = await fetch(`/api/warehouse/check/${checkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });

      const data = await res.json();
      if (data.success) {
        fetchCheckDetail();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(String(err));
    }
  };

  const handleAdjust = async () => {
    if (!check) return;

    const unadjustedDiffs = check.items.filter((item) => item.difference !== 0 && !item.isAdjusted);
    if (unadjustedDiffs.length === 0) {
      alert("没有需要调整的差异项");
      return;
    }

    if (!confirm(`确定要将 ${unadjustedDiffs.length} 个差异项应用到系统库存吗？`)) return;

    try {
      const res = await fetch(`/api/warehouse/check/${checkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "adjust" }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`已成功调整 ${data.data.adjustedCount} 个物料的库存`);
        fetchCheckDetail();
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

  if (!check) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl">盘点记录不存在</div>;
  }

  const unadjustedDiffs = check.items.filter((item) => {
    const currentDiff = (editingItems[item.id] ?? item.actualStock) - item.systemStock;
    return currentDiff !== 0 && !item.isAdjusted;
  });
  const hasChanges = check.items.some((item) => editingItems[item.id] !== item.actualStock);

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/warehouse/check" className="text-gray-500 hover:text-gray-700">
            ← 返回
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">盘点详情 - {check.checkMonth}</h1>
          {check.status === "pending" ? (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
              进行中
            </span>
          ) : (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
              已完成
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {check.status === "pending" && (
            <>
              {hasChanges && (
                <button
                  onClick={handleSaveItems}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存修改"}
                </button>
              )}
              {unadjustedDiffs.length > 0 && (
                <button
                  onClick={handleAdjust}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  一键调整库存 ({unadjustedDiffs.length})
                </button>
              )}
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                完成盘点
              </button>
            </>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">物料总数</div>
          <div className="text-2xl font-semibold text-gray-900">{check.totalItems}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">差异项</div>
          <div className={`text-2xl font-semibold ${check.diffItems > 0 ? "text-red-600" : "text-gray-900"}`}>
            {check.diffItems}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">创建人</div>
          <div className="text-lg font-medium text-gray-900">{check.operatorName}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">创建时间</div>
          <div className="text-sm font-medium text-gray-900">{formatDateTime(check.createdAt)}</div>
        </div>
      </div>

      {/* 盘点明细表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-4 py-3 text-left text-sm font-medium">物料名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium">规格</th>
                <th className="px-4 py-3 text-left text-sm font-medium">单位</th>
                <th className="px-4 py-3 text-right text-sm font-medium">系统库存</th>
                <th className="px-4 py-3 text-right text-sm font-medium">实际库存</th>
                <th className="px-4 py-3 text-right text-sm font-medium">差异</th>
                <th className="px-4 py-3 text-center text-sm font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {check.items.map((item) => {
                const currentEdit = editingItems[item.id] ?? item.actualStock;
                const currentDiff = currentEdit - item.systemStock;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.materialName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.materialSpec || "-"}</td>
                    <td className="px-4 py-3 text-sm">{item.materialUnit}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{item.systemStock}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {check.status === "pending" ? (
                        <input
                          type="number"
                          step="1"
                          value={currentEdit}
                          onChange={(e) => handleActualStockChange(item.id, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-200 rounded text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="font-mono">{item.actualStock}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {currentDiff > 0 ? (
                        <span className="text-green-600">+{currentDiff}</span>
                      ) : currentDiff < 0 ? (
                        <span className="text-red-600">{currentDiff}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {currentDiff !== 0 ? (
                        item.isAdjusted ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            已调整
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                            待调整
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                          一致
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {check.status === "pending" && (
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
          <p className="font-medium">提示：</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>在"实际库存"列输入实际盘点数量</li>
            <li>修改后点击"保存修改"保存录入数据</li>
            <li>确认无误后点击"完成盘点"结束盘点</li>
            <li>盘点完成后可在盘点列表页一键调整库存差异</li>
          </ul>
        </div>
      )}
    </div>
  );
}
