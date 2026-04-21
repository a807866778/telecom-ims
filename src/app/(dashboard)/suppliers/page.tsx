"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSuppliers(d.data);
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
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
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
        <h1 className="text-xl font-semibold text-gray-900">供应商管理</h1>
        <Link href="/suppliers/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 添加供应商
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((supplier) => (
          <Link key={supplier.id} href={`/suppliers/${supplier.id}`}>
            <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow h-full cursor-pointer">
              <h3 className="font-semibold text-gray-900 mb-2">{supplier.name}</h3>
              {supplier.contact && (
                <div className="text-sm text-gray-500 mb-1">联系人: {supplier.contact}</div>
              )}
              {supplier.phone && (
                <div className="text-sm text-gray-500 mb-1">电话: {supplier.phone}</div>
              )}
              {supplier.address && (
                <div className="text-sm text-gray-400 truncate">📍 {supplier.address}</div>
              )}
            </div>
          </Link>
        ))}

        {suppliers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            暂无供应商，<Link href="/suppliers/new" className="text-blue-600">添加第一个供应商</Link>
          </div>
        )}
      </div>
    </div>
  );
}
