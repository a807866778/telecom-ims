"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";

interface DashboardSidebarProps {
  user: {
    id: string;
    username: string;
    realName: string;
    permissions: string[];
  };
}

const menuItems = [
  {
    title: "工作台",
    href: "/dashboard",
    icon: "📊",
    permission: "dashboard:view",
  },
  {
    title: "物料管理",
    href: "/materials",
    icon: "📦",
    permission: "material:view",
  },
  {
    title: "采购管理",
    href: "/purchase/orders",
    icon: "🛒",
    permission: "purchase:view",
    children: [
      { title: "采购订单", href: "/purchase/orders", icon: "📋" },
      { title: "收货记录", href: "/purchase/receipts", icon: "📥" },
      { title: "退货管理", href: "/purchase/returns", icon: "↩️" },
      { title: "退货记录", href: "/purchase/returns/records", icon: "📜" },
    ],
  },
  {
    title: "入库管理",
    href: "/inbound",
    icon: "📥",
    permission: "inbound:view",
  },
  {
    title: "出库管理",
    href: "/outbound",
    icon: "📤",
    permission: "outbound:view",
    children: [
      { title: "出库单", href: "/outbound", icon: "📋" },
      { title: "退库单", href: "/outbound/returns", icon: "↩️" },
    ],
  },
  {
    title: "仓储管理",
    href: "/warehouse/inventory",
    icon: "🏭",
    permission: "warehouse:view",
    children: [
      { title: "库存查询", href: "/warehouse/inventory", icon: "📋" },
      { title: "入库记录", href: "/warehouse/inbound/records", icon: "📥" },
      { title: "出库记录", href: "/warehouse/outbound/records", icon: "📤" },
      { title: "报溢报损", href: "/warehouse/adjustments", icon: "⚖️" },
      { title: "流向查询", href: "/warehouse/flow", icon: "🔍" },
      { title: "库存盘点", href: "/warehouse/check", icon: "📊" },
    ],
  },
  {
    title: "项目管理",
    href: "/projects",
    icon: "🏗️",
    permission: "project:view",
    children: [
      { title: "项目列表", href: "/projects", icon: "📋" },
      { title: "项目汇总", href: "/projects/summary", icon: "📊" },
    ],
  },
  {
    title: "档案管理",
    href: "/archive/distributors",
    icon: "📁",
    permission: "archive:view",
    children: [
      { title: "客户档案", href: "/archive/distributors", icon: "🏢" },
      { title: "供应商档案", href: "/archive/suppliers", icon: "🏭" },
      { title: "商品管理", href: "/archive/products", icon: "📦" },
      { title: "项目合同", href: "/archive/contracts", icon: "📄" },
      { title: "账目往来", href: "/archive/payment-records", icon: "💰" },
      { title: "通讯录", href: "/archive/contacts", icon: "📇" },
    ],
  },
  {
    title: "人员管理",
    href: "/staff/list",
    icon: "👥",
    permission: "staff:view",
    children: [
      { title: "人员列表", href: "/staff/list", icon: "👤" },
      { title: "健康档案", href: "/staff/health", icon: "🏥" },
      { title: "证照档案", href: "/staff/licenses", icon: "📜" },
    ],
  },
  {
    title: "安规培训",
    href: "/training/learn",
    icon: "🎓",
    permission: "training:view",
    children: [
      { title: "在线学习", href: "/training/learn", icon: "📖" },
      { title: "培训考核", href: "/training/exam", icon: "✍️" },
      { title: "培训记录", href: "/training/records", icon: "📝" },
      { title: "内容管理", href: "/training/content", icon: "⚙️" },
    ],
  },
  {
    title: "售后管理",
    href: "/service/complaints",
    icon: "📞",
    permission: "service:view",
    children: [
      { title: "客户投诉", href: "/service/complaints", icon: "📋" },
      { title: "设备售后", href: "/service/after-sales", icon: "🔧" },
    ],
  },
  {
    title: "供应商",
    href: "/suppliers",
    icon: "🏢",
    permission: "supplier:view",
  },
  {
    title: "收益报表",
    href: "/reports/daily",
    icon: "📈",
    permission: "report:view",
  },
  {
    title: "系统设置",
    href: "/settings/roles",
    icon: "⚙️",
    permission: "settings:view",
    children: [
      { title: "职位权限", href: "/settings/roles", icon: "👥" },
      { title: "员工管理", href: "/settings/users", icon: "👤" },
      { title: "通知管理", href: "/settings/notifications", icon: "🔔" },
      { title: "报表生成", href: "/settings/reports", icon: "📊" },
    ],
  },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  function hasAccess(permission?: string) {
    if (!permission) return true;
    return user.permissions.includes(permission);
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto hidden lg:block">
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          if (!hasAccess(item.permission)) return null;

          // 有子菜单时：父级激活 = 当前路径以父级href开头（但子菜单各自精确匹配）
          // 无子菜单时：精确匹配或以href/开头
          const isActive = item.children
            ? pathname === item.href || pathname.startsWith(item.href + "/") || item.children.some(c => pathname === c.href || pathname.startsWith(c.href + "/"))
            : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.title}</span>
              </Link>

              {item.children && isActive && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => {
                    // 子菜单精确匹配（避免 /outbound 匹配到 /outbound/returns）
                    const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          isChildActive
                            ? "bg-primary-50 text-primary-700"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span>{child.icon}</span>
                        <span>{child.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
