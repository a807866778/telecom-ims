"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  clientName: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  address: string | null;
  bankAccount: string | null;
  taxNumber: string | null;
  invoiceTitle: string | null;
  status: string;
  startDate: number | null;
  endDate: number | null;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  notes: string | null;
  createdAt: number;
}

interface OutboundRecord {
  id: string;
  totalAmount: number;
  notes: string | null;
  createdAt: number;
}

interface MaterialSummary {
  id: string;
  name: string;
  spec: string | null;
  unit: string;
  totalQuantity: number;
  purchasePrice: number;
  salePrice: number;
  totalCost: number;
  totalRevenue: number;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{
    project: Project;
    outboundRecords: OutboundRecord[];
    materials: MaterialSummary[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${id}`)
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
          加载失败: {error || "项目不存在"}
        </div>
        <Link href="/projects" className="text-blue-600 hover:text-blue-700">
          ← 返回项目列表
        </Link>
      </div>
    );
  }

  const { project, outboundRecords, materials } = data;

  const statusColors: Record<string, string> = {
    "进行中": "bg-green-100 text-green-800",
    "已完成": "bg-blue-100 text-blue-800",
    "已归档": "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      {/* 项目信息 */}
      <div className="flex justify-between items-start">
        <div>
          <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← 返回项目列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.clientName && (
            <p className="text-gray-500">甲方: {project.clientName}</p>
          )}
        </div>
        <span className={`px-3 py-1 text-sm rounded-full ${statusColors[project.status] || "bg-gray-100"}`}>
          {project.status}
        </span>
      </div>

      {/* 基本信息卡片 */}
      <div className="card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {project.contactPerson && (
            <div>
              <div className="text-sm text-gray-500">联系人</div>
              <div className="text-gray-900">{project.contactPerson}</div>
            </div>
          )}
          {project.contactPhone && (
            <div>
              <div className="text-sm text-gray-500">联系电话</div>
              <div className="text-gray-900">{project.contactPhone}</div>
            </div>
          )}
          {project.address && (
            <div>
              <div className="text-sm text-gray-500">项目地址</div>
              <div className="text-gray-900 truncate">{project.address}</div>
            </div>
          )}
          {project.startDate && (
            <div>
              <div className="text-sm text-gray-500">开始日期</div>
              <div className="text-gray-900">
                {new Date(project.startDate).toLocaleDateString("zh-CN")}
              </div>
            </div>
          )}
          {project.bankAccount && (
            <div>
              <div className="text-sm text-gray-500">银行账号</div>
              <div className="text-gray-900 font-mono text-sm">{project.bankAccount}</div>
            </div>
          )}
          {project.taxNumber && (
            <div>
              <div className="text-sm text-gray-500">税号</div>
              <div className="text-gray-900 font-mono text-sm">{project.taxNumber}</div>
            </div>
          )}
          {project.invoiceTitle && (
            <div>
              <div className="text-sm text-gray-500">发票抬头</div>
              <div className="text-gray-900">{project.invoiceTitle}</div>
            </div>
          )}
        </div>
        {project.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">备注</div>
            <div className="text-gray-900">{project.notes}</div>
          </div>
        )}
      </div>

      {/* 成本统计 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 bg-green-50">
          <div className="text-sm text-green-600">产值</div>
          <div className="text-2xl font-bold text-green-700 font-mono">
            ¥{project.totalRevenue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card p-4 bg-orange-50">
          <div className="text-sm text-orange-600">成本</div>
          <div className="text-2xl font-bold text-orange-700 font-mono">
            ¥{project.totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card p-4 bg-blue-50">
          <div className="text-sm text-blue-600">利润</div>
          <div className={`text-2xl font-bold font-mono ${project.totalProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>
            ¥{project.totalProfit.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* 物料使用明细 */}
      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">物料使用明细</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left">物料名称</th>
                <th className="px-4 py-3 text-left">规格</th>
                <th className="px-4 py-3 text-right">用量</th>
                <th className="px-4 py-3 text-right">单位</th>
                <th className="px-4 py-3 text-right">采购价</th>
                <th className="px-4 py-3 text-right">结算价</th>
                <th className="px-4 py-3 text-right">成本</th>
                <th className="px-4 py-3 text-right">产值</th>
                <th className="px-4 py-3 text-right">利润</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materials.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-gray-500">{m.spec || "-"}</td>
                  <td className="px-4 py-3 text-right font-mono">{m.totalQuantity}</td>
                  <td className="px-4 py-3">{m.unit}</td>
                  <td className="px-4 py-3 text-right font-mono">¥{m.purchasePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">¥{m.salePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-orange-600">¥{m.totalCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-600">¥{m.totalRevenue.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${m.totalRevenue - m.totalCost >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    ¥{(m.totalRevenue - m.totalCost).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            {materials.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={6} className="px-4 py-3 text-right">合计</td>
                  <td className="px-4 py-3 text-right font-mono text-orange-600">
                    ¥{project.totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-600">
                    ¥{project.totalRevenue.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${project.totalProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    ¥{project.totalProfit.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          {materials.length === 0 && (
            <div className="p-8 text-center text-gray-400">暂无物料使用记录</div>
          )}
        </div>
      </div>

      {/* 出库记录列表 */}
      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">出库记录</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {outboundRecords.map((record) => (
            <div key={record.id} className="p-4 flex justify-between items-center">
              <div>
                <div className="font-mono text-sm text-gray-500">{record.id.slice(0, 8)}</div>
                <div className="text-sm text-gray-500">
                  {new Date(record.createdAt).toLocaleString("zh-CN")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-blue-600">¥{record.totalAmount.toFixed(2)}</div>
                {record.notes && <div className="text-xs text-gray-400">{record.notes}</div>}
              </div>
            </div>
          ))}
          {outboundRecords.length === 0 && (
            <div className="p-8 text-center text-gray-400">暂无出库记录</div>
          )}
        </div>
      </div>
    </div>
  );
}
