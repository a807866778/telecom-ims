"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface MaterialDetail {
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
  notes: string | null;
  createdAt: number;
}

interface InboundRecord {
  id: string;
  quantity: number;
  price: number;
  supplierName: string;
  createdAt: number;
}

interface OutboundRecord {
  id: string;
  quantity: number;
  price: number;
  createdAt: number;
}

export default function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ material: MaterialDetail; inbound: InboundRecord[]; outbound: OutboundRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/materials?id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d.data);
        } else {
          setError(d.error);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-xl">
          加载失败: {error || "物料不存在"}
        </div>
        <Link href="/materials" className="text-blue-600 hover:text-blue-700">
          ← 返回物料列表
        </Link>
      </div>
    );
  }

  const { material, inbound, outbound } = data;
  const totalInbound = inbound.reduce((sum, r) => sum + r.quantity, 0);
  const totalOutbound = outbound.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="space-y-6">
      {/* 物料信息 */}
      <div className="flex justify-between items-start">
        <div>
          <Link href="/materials" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← 返回物料列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{material.name}</h1>
          <p className="text-gray-500">{material.categoryName}</p>
        </div>
        <Link
          href={`/materials/${material.id}/edit`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          编辑
        </Link>
      </div>

      {/* 基本信息卡片 */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">基本信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-500">规格型号</div>
            <div className="text-gray-900">{material.spec || "-"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">单位</div>
            <div className="text-gray-900">{material.unit}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">采购价</div>
            <div className="text-gray-900 font-mono">¥{material.purchasePrice.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">结算价</div>
            <div className="text-green-600 font-mono">¥{material.salePrice.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">当前库存</div>
            <div className={`text-2xl font-bold font-mono ${material.stockQuantity <= material.minStockWarning ? "text-orange-600" : "text-gray-900"}`}>
              {material.stockQuantity} {material.unit}
            </div>
            {material.stockQuantity <= material.minStockWarning && (
              <div className="text-xs text-orange-500">⚠️ 库存不足</div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-500">库存预警值</div>
            <div className="text-gray-900">{material.minStockWarning} {material.unit}</div>
          </div>
        </div>
        {material.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">备注</div>
            <div className="text-gray-900">{material.notes}</div>
          </div>
        )}
      </div>

      {/* 库存统计 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 bg-green-50">
          <div className="text-sm text-green-600">累计入库</div>
          <div className="text-2xl font-bold text-green-700 font-mono">{totalInbound}</div>
        </div>
        <div className="card p-4 bg-red-50">
          <div className="text-sm text-red-600">累计出库</div>
          <div className="text-2xl font-bold text-red-700 font-mono">{totalOutbound}</div>
        </div>
        <div className="card p-4 bg-blue-50">
          <div className="text-sm text-blue-600">当前库存</div>
          <div className={`text-2xl font-bold font-mono ${material.stockQuantity <= material.minStockWarning ? "text-orange-700" : "text-blue-700"}`}>
            {material.stockQuantity}
          </div>
        </div>
      </div>

      {/* 入库记录 */}
      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">入库记录</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {inbound.length > 0 ? (
            inbound.map((record) => (
              <div key={record.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-mono text-sm text-gray-500">{record.id.slice(0, 8)}</div>
                  <div className="text-sm text-gray-500">
                    {record.supplierName || "未知供应商"} • {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-green-600">+{record.quantity}</div>
                  <div className="text-xs text-gray-400">¥{record.price.toFixed(2)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">暂无入库记录</div>
          )}
        </div>
      </div>

      {/* 出库记录 */}
      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">出库记录</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {outbound.length > 0 ? (
            outbound.map((record) => (
              <div key={record.id} className="p-4 flex justify-between items-center">
                <div className="font-mono text-sm text-gray-500">{record.id.slice(0, 8)}</div>
                <div className="text-right">
                  <div className="font-mono text-red-600">-{record.quantity}</div>
                  <div className="text-xs text-gray-400">{new Date(record.createdAt).toLocaleDateString("zh-CN")}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">暂无出库记录</div>
          )}
        </div>
      </div>
    </div>
  );
}
