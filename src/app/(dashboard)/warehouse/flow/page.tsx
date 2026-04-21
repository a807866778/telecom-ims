"use client";

import { useEffect, useState } from "react";

interface Material {
  id: string;
  name: string;
  spec: string | null;
  unit: string;
  stockQuantity: number;
}

interface FlowRecord {
  type: string;
  recordId: string;
  timestamp: number;
  quantity: number;
  unitPrice: number;
  sourceName: string | null;
  operatorName: string;
  projectName: string | null;
  adjustmentReason: string | null;
  remark: string | null;
  photoUrl: string | null;
  balance: number;
}

interface FlowData {
  material: Material;
  flows: FlowRecord[];
  totalInbound: number;
  totalOutbound: number;
}

// 类型配置
const typeConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  "直接入库": { color: "text-green-700", bgColor: "bg-green-100", label: "直接入库" },
  "采购入库": { color: "text-blue-700", bgColor: "bg-blue-100", label: "采购入库" },
  "报溢入库": { color: "text-emerald-700", bgColor: "bg-emerald-100", label: "报溢入库" },
  "直接出库": { color: "text-red-700", bgColor: "bg-red-100", label: "直接出库" },
  "退货出库": { color: "text-orange-700", bgColor: "bg-orange-100", label: "退货出库" },
  "报损出库": { color: "text-rose-700", bgColor: "bg-rose-100", label: "报损出库" },
};

export default function FlowPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchMaterials();
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

  const fetchFlow = async () => {
    if (!selectedMaterialId) {
      setError("请选择物料");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("materialId", selectedMaterialId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/warehouse/flow?${params}`);
      const data = await res.json();
      if (data.success) {
        setFlowData(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const isInbound = (type: string) => type.includes("入库");
  const getTypeConfig = (type: string) => typeConfig[type] || { color: "text-gray-700", bgColor: "bg-gray-100", label: type };

  const getSourceInfo = (flow: FlowRecord) => {
    if (isInbound(flow.type)) {
      return flow.sourceName || "-";
    } else {
      return flow.projectName || "-";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">流向查询</h1>
      </div>

      {/* 查询区域 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm text-gray-600 mb-1">物料 *</label>
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择物料</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.spec || "无规格"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchFlow}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "查询中..." : "查询流向"}
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>}

      {/* 流向结果 */}
      {flowData && (
        <div className="space-y-4">
          {/* 物料信息卡片 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {flowData.material.name}
                  {flowData.material.spec && (
                    <span className="text-gray-500 text-base font-normal ml-2">({flowData.material.spec})</span>
                  )}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  单位: {flowData.material.unit} | 当前库存: {flowData.material.stockQuantity} {flowData.material.unit}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">统计期间</div>
                <div className="text-lg font-semibold">
                  <span className="text-green-600">+{flowData.totalInbound}</span>
                  <span className="text-gray-400 mx-2">/</span>
                  <span className="text-red-600">-{flowData.totalOutbound}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 类型说明 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">类型说明</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeConfig).map(([type, config]) => (
                <span key={type} className={`px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                  {config.label}
                </span>
              ))}
            </div>
          </div>

          {/* 时间线 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">流向时间线</h3>
            {flowData.flows.length === 0 ? (
              <div className="text-center py-8 text-gray-400">该期间内无流向记录</div>
            ) : (
              <div className="space-y-0">
                {flowData.flows.map((flow, index) => {
                  const config = getTypeConfig(flow.type);
                  return (
                    <div key={index} className="flex">
                      {/* 时间线左侧 */}
                      <div className="flex flex-col items-center mr-4">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isInbound(flow.type) ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        {index < flowData.flows.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                        )}
                      </div>
                      {/* 内容 */}
                      <div className="flex-1 pb-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                                {config.label}
                              </span>
                              <span className="text-sm text-gray-500">{formatDateTime(flow.timestamp)}</span>
                            </div>
                            <div className="mt-2 text-sm">
                              <span className="text-gray-600">{isInbound(flow.type) ? "供应商" : "项目"}: </span>
                              <span className="font-medium">{getSourceInfo(flow)}</span>
                            </div>
                            {flow.adjustmentReason && (
                              <div className="mt-1 text-sm text-gray-500">
                                原因: {flow.adjustmentReason}
                              </div>
                            )}
                            <div className="mt-1 text-sm text-gray-500">
                              操作员: {flow.operatorName || "-"}
                            </div>
                            {flow.photoUrl && (
                              <div className="mt-2">
                                <img
                                  src={flow.photoUrl}
                                  alt="照片"
                                  className="max-w-xs rounded-lg border border-gray-200"
                                />
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-lg font-mono font-medium ${
                                isInbound(flow.type) ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {isInbound(flow.type) ? "+" : "-"}
                              {flow.quantity} {flowData.material.unit}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              单价: ¥{flow.unitPrice.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              库存: {flow.balance} {flowData.material.unit}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 流向表格 */}
          {flowData.flows.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1e3a5f] text-white">
                      <th className="px-4 py-3 text-left text-sm font-medium">时间</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">类型</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">来源/去向</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">数量</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">单价</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">库存余额</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">操作员</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {flowData.flows.map((flow, index) => {
                      const config = getTypeConfig(flow.type);
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(flow.timestamp)}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                              {config.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getSourceInfo(flow)}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-right font-mono font-medium ${
                              isInbound(flow.type) ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isInbound(flow.type) ? "+" : "-"}
                            {flow.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono">¥{flow.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono">{flow.balance}</td>
                          <td className="px-4 py-3 text-sm">{flow.operatorName || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
