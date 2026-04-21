"use client";

import { useEffect, useState, useCallback } from "react";

interface PaymentRecord {
  id: string;
  type: "income" | "expense";
  counterpartyType: "supplier" | "distributor";
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  paymentDate: string;
  relatedProjectId?: string;
  relatedProjectName?: string;
  remark?: string;
}

interface SummaryRecord {
  counterpartyId: string;
  counterpartyName: string;
  totalAmount: number;
  recordCount: number;
}

interface SummaryData {
  period: string;
  group: string;
  total: number;
  records: SummaryRecord[];
}

export default function PaymentRecordsPage() {
  const [activeTab, setActiveTab] = useState<"flow" | "customer" | "supplier">("flow");
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [customerSummary, setCustomerSummary] = useState<SummaryData | null>(null);
  const [supplierSummary, setSupplierSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"year" | "month">("year");

  // 新增表单
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    type: "income" as "income" | "expense",
    counterpartyType: "distributor" as "distributor" | "supplier",
    counterpartyId: "",
    counterpartyName: "",
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    relatedProjectId: "",
    relatedProjectName: "",
    remark: "",
  });
  const [saving, setSaving] = useState(false);

  // 下拉数据
  const [distributors, setDistributors] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const fetchDistributors = useCallback(async () => {
    const res = await fetch("/api/archive/distributors");
    const json = await res.json();
    if (json.success) {
      setDistributors(json.data.map((d: any) => ({ id: d.id, name: d.name })));
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    const res = await fetch("/api/suppliers");
    const json = await res.json();
    if (json.success) {
      setSuppliers(json.data.map((s: any) => ({ id: s.id, name: s.name })));
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    const json = await res.json();
    if (json.success) {
      setProjects(json.data.map((p: any) => ({ id: p.id, name: p.name })));
    }
  }, []);

  const fetchFlow = useCallback(async () => {
    const res = await fetch("/api/archive/payment-records");
    const json = await res.json();
    if (json.success) {
      setRecords(json.data);
    }
  }, []);

  const fetchCustomerSummary = useCallback(async () => {
    const res = await fetch(`/api/archive/payment-records?mode=summary&group=customer&period=${period}`);
    const json = await res.json();
    if (json.success) {
      setCustomerSummary(json.data);
    }
  }, [period]);

  const fetchSupplierSummary = useCallback(async () => {
    const res = await fetch(`/api/archive/payment-records?mode=summary&group=supplier&period=${period}`);
    const json = await res.json();
    if (json.success) {
      setSupplierSummary(json.data);
    }
  }, [period]);

  useEffect(() => {
    Promise.all([fetchDistributors(), fetchSuppliers(), fetchProjects()]).then(() => setLoading(false));
  }, [fetchDistributors, fetchSuppliers, fetchProjects]);

  useEffect(() => {
    if (activeTab === "flow") {
      fetchFlow();
    } else if (activeTab === "customer") {
      fetchCustomerSummary();
    } else {
      fetchSupplierSummary();
    }
  }, [activeTab, period, fetchFlow, fetchCustomerSummary, fetchSupplierSummary]);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.counterpartyName || !form.amount) return;
    setSaving(true);

    const res = await fetch("/api/archive/payment-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (json.success) {
      setShowAddModal(false);
      setForm({
        type: "income",
        counterpartyType: "distributor",
        counterpartyId: "",
        counterpartyName: "",
        amount: "",
        paymentDate: new Date().toISOString().slice(0, 10),
        relatedProjectId: "",
        relatedProjectName: "",
        remark: "",
      });
      fetchFlow();
    }
    setSaving(false);
  };

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这条记录？")) return;
    const res = await fetch(`/api/archive/payment-records?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  };

  const handleCounterpartyChange = (id: string, type: "distributor" | "supplier") => {
    const list = type === "distributor" ? distributors : suppliers;
    const item = list.find((d) => d.id === id);
    if (item) {
      setForm((prev) => ({
        ...prev,
        counterpartyId: id,
        counterpartyName: item.name,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">账目往来</h1>
          <p className="text-gray-500 mt-1">管理客户收入与供应商支出记录</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          记一笔
        </button>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: "flow", label: "款项流向" },
            { key: "customer", label: "客户累计收入" },
            { key: "supplier", label: "供应商累计支出" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 款项流向 */}
      {activeTab === "flow" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">日期</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">对方</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">关联项目</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">金额</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">备注</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      暂无记录
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{record.paymentDate}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            record.type === "income"
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {record.type === "income" ? "收入" : "支出"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{record.counterpartyName}</div>
                        <div className="text-xs text-gray-400">
                          {record.counterpartyType === "distributor" ? "客户" : "供应商"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {record.relatedProjectName || "-"}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-bold text-right ${
                          record.type === "income" ? "text-green-600" : "text-orange-600"
                        }`}
                      >
                        {record.type === "income" ? "+" : "-"}¥{formatCurrency(record.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{record.remark || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 客户累计收入 */}
      {activeTab === "customer" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {(["year", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    period === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p === "year" ? "年度" : "月度"}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              统计周期：{customerSummary?.period === "year" ? "本年度" : "本月度"} · 共计
              <span className="text-green-600 font-bold ml-1">
                ¥{formatCurrency(customerSummary?.total || 0)}
              </span>
            </div>
          </div>

          {customerSummary && customerSummary.records.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="space-y-4">
                {customerSummary.records.map((r, idx) => {
                  const maxAmount = customerSummary.records[0]?.totalAmount || 1;
                  const percentage = (r.totalAmount / maxAmount) * 100;
                  return (
                    <div key={r.counterpartyId} className="flex items-center gap-4">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{r.counterpartyName}</span>
                          <span className="text-sm font-bold text-green-600 ml-2">¥{formatCurrency(r.totalAmount)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 w-8 text-right">{r.recordCount}笔</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">客户名称</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">累计收入</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">记录数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerSummary?.records.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    customerSummary?.records.map((record) => (
                      <tr key={record.counterpartyId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.counterpartyName}</td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                          ¥{formatCurrency(record.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">{record.recordCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {customerSummary && customerSummary.records.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">合计</td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                        ¥{formatCurrency(customerSummary.total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {customerSummary.records.reduce((sum, r) => sum + r.recordCount, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 供应商累计支出 */}
      {activeTab === "supplier" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {(["year", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    period === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p === "year" ? "年度" : "月度"}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              统计周期：{supplierSummary?.period === "year" ? "本年度" : "本月度"} · 共计
              <span className="text-orange-600 font-bold ml-1">
                ¥{formatCurrency(supplierSummary?.total || 0)}
              </span>
            </div>
          </div>

          {supplierSummary && supplierSummary.records.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="space-y-4">
                {supplierSummary.records.map((r, idx) => {
                  const maxAmount = supplierSummary.records[0]?.totalAmount || 1;
                  const percentage = (r.totalAmount / maxAmount) * 100;
                  return (
                    <div key={r.counterpartyId} className="flex items-center gap-4">
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{r.counterpartyName}</span>
                          <span className="text-sm font-bold text-orange-600 ml-2">¥{formatCurrency(r.totalAmount)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 w-8 text-right">{r.recordCount}笔</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">供应商名称</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">累计支出</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">记录数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplierSummary?.records.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-3 py-8 text-center text-gray-400">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    supplierSummary?.records.map((record) => (
                      <tr key={record.counterpartyId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.counterpartyName}</td>
                        <td className="px-4 py-3 text-sm font-bold text-orange-600 text-right">
                          ¥{formatCurrency(record.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">{record.recordCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {supplierSummary && supplierSummary.records.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">合计</td>
                      <td className="px-4 py-3 text-sm font-bold text-orange-600 text-right">
                        ¥{formatCurrency(supplierSummary.total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {supplierSummary.records.reduce((sum, r) => sum + r.recordCount, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 新增弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">记一笔账</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* 类型切换 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">收支类型</label>
                <div className="flex gap-2">
                  {[
                    { key: "income", label: "收入", color: "green" },
                    { key: "expense", label: "支出", color: "orange" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          type: t.key as "income" | "expense",
                          counterpartyType: t.key === "income" ? "distributor" : "supplier",
                          counterpartyId: "",
                          counterpartyName: "",
                        }))
                      }
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        form.type === t.key
                          ? t.color === "green"
                            ? "bg-green-100 text-green-700 border-2 border-green-500"
                            : "bg-orange-100 text-orange-700 border-2 border-orange-500"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 对方选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.type === "income" ? "客户" : "供应商"}
                </label>
                <select
                  value={form.counterpartyId}
                  onChange={(e) => handleCounterpartyChange(e.target.value, form.counterpartyType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">请选择</option>
                  {(form.counterpartyType === "distributor" ? distributors : suppliers).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 金额 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金额（元）</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* 日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* 关联项目 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联项目（可选）</label>
                <select
                  value={form.relatedProjectId}
                  onChange={(e) => {
                    const p = projects.find((proj) => proj.id === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      relatedProjectId: e.target.value,
                      relatedProjectName: p?.name || "",
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">无</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={form.remark}
                  onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="可选"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
