"use client";

import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { usePathname } from "next/navigation";

interface DashboardHeaderProps {
  user: {
    id: string;
    username: string;
    realName: string;
    permissions: string[];
  };
}

const pageTitles: Record<string, string> = {
  "/dashboard": "工作台",
  "/materials": "物料管理",
  "/inbound": "入库管理",
  "/outbound": "出库管理",
  "/projects": "项目管理",
  "/suppliers": "供应商管理",
  "/reports/daily": "收益报表",
  "/settings/roles": "职位权限",
  "/settings/users": "员工管理",
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  )?.[1] || "工作台";

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 lg:hidden">
            进存销管理
          </h1>
          <h1 className="text-lg font-semibold text-gray-900 hidden lg:block">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="hidden sm:inline">{user.realName}</span>
            <span className="lg:hidden">👤</span>
          </div>

          <Link
            href="/profile"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            个人设置
          </Link>

          <button
            onClick={() => logout()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
