"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  IconHome, IconPackage, IconUpload, IconBuilding, IconClipboard,
  IconFolder, IconUsers, IconBook, IconWrench, IconBarChart,
  IconSettings, IconMenu, IconClose, IconChevronDown, IconChevronLeft,
} from "@/components/ui/Icons";

interface NavItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: NavItem[];
  adminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  {
    label: "首页",
    icon: <IconHome className="w-5 h-5" />,
    href: "/dashboard"
  },
  {
    label: "采购管理",
    icon: <IconPackage className="w-5 h-5" />,
    children: [
      { label: "采购订单", href: "/purchase/orders" },
      { label: "采购收货", href: "/purchase/receipts" },
      { label: "采购退货", href: "/purchase/returns" },
    ]
  },
  {
    label: "出库管理",
    icon: <IconUpload className="w-5 h-5" />,
    children: [
      { label: "出库单", href: "/outbound" },
      { label: "退库单", href: "/outbound/returns" },
    ]
  },
  {
    label: "项目管理",
    icon: <IconBuilding className="w-5 h-5" />,
    children: [
      { label: "项目列表", href: "/projects" },
      { label: "项目汇总", href: "/projects/summary" },
    ]
  },
  {
    label: "仓储管理",
    icon: <IconClipboard className="w-5 h-5" />,
    children: [
      { label: "库存查询", href: "/warehouse/inventory" },
      { label: "入库记录", href: "/warehouse/inbound/records" },
      { label: "出库记录", href: "/warehouse/outbound/records" },
      { label: "报溢报损", href: "/warehouse/adjustments" },
      { label: "流向查询", href: "/warehouse/flow" },
      { label: "库存盘点", href: "/warehouse/check" },
    ]
  },
  {
    label: "档案管理",
    icon: <IconFolder className="w-5 h-5" />,
    children: [
      { label: "供应商档案", href: "/archive/suppliers" },
      { label: "客户档案", href: "/archive/distributors" },
      { label: "商品管理", href: "/archive/products" },
      { label: "项目合同", href: "/archive/contracts" },
      { label: "账目往来", href: "/archive/payment-records" },
      { label: "通讯录", href: "/archive/contacts" },
    ]
  },
  {
    label: "人员管理",
    icon: <IconUsers className="w-5 h-5" />,
    children: [
      { label: "人员列表", href: "/staff/list" },
      { label: "健康档案", href: "/staff/health" },
      { label: "证照档案", href: "/staff/licenses" },
    ]
  },
  {
    label: "安规培训",
    icon: <IconBook className="w-5 h-5" />,
    children: [
      { label: "培训内容", href: "/training/learn" },
      { label: "题库管理", href: "/training/content", adminOnly: true },
      { label: "培训考核", href: "/training/exam" },
      { label: "培训记录", href: "/training/records" },
    ]
  },
  {
    label: "售后管理",
    icon: <IconWrench className="w-5 h-5" />,
    children: [
      { label: "客户投诉", href: "/service/complaints" },
      { label: "设备售后", href: "/service/after-sales" },
    ]
  },
];

const settingsNavItems: NavItem[] = [
  {
    label: "报表管理",
    icon: <IconBarChart className="w-5 h-5" />,
    children: [
      { label: "日报表", href: "/reports/daily" },
      { label: "月报表", href: "/reports/monthly" },
    ]
  },
  {
    label: "账号管理",
    icon: <IconSettings className="w-5 h-5" />,
    children: [
      { label: "用户账号", href: "/settings/users" },
      { label: "角色权限", href: "/settings/roles", adminOnly: true },
    ]
  },
];

interface CurrentUser {
  id: string;
  username: string;
  realName: string;
  role: string;
}

// 渲染单个导航项（支持子菜单）
function NavLinkItem({ item, collapsed, expanded, userRole, pathname, onToggle, onChildClick }: {
  item: NavItem;
  collapsed: boolean;
  expanded: boolean;
  userRole: string;
  pathname: string;
  onToggle: () => void;
  onChildClick?: () => void;
}) {
  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false;
  const hasActiveChild = item.children?.some(c => c.href && (pathname === c.href || pathname.startsWith(c.href + "/"))) ?? false;

  if (item.children) {
    // 有子菜单
    const visibleChildren = item.children.filter(c => !c.adminOnly || userRole === "admin");
    return (
      <div>
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            hasActiveChild
              ? "bg-blue-600 text-white"
              : "text-blue-200 hover:bg-blue-800 hover:text-white"
          }`}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
              <IconChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`} />
            </>
          )}
        </button>
        {!collapsed && expanded && (
          <div className="ml-4 mt-1 space-y-0.5">
            {visibleChildren.map((child) => {
              const childActive = child.href ? pathname === child.href : false;
              return (
                <Link
                  key={child.href}
                  href={child.href || "/"}
                  onClick={onChildClick}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${
                    childActive
                      ? "bg-blue-500 text-white"
                      : "text-blue-300 hover:bg-blue-700 hover:text-white"
                  }`}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 无子菜单
  return (
    <Link
      href={item.href || "/"}
      onClick={onChildClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-blue-200 hover:bg-blue-800 hover:text-white"
      }`}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.hasCookie) {
          setIsAuthenticated(true);
          setUsername(data.user?.realName || data.user?.username || "管理员");
          setUserRole(data.user?.role || "user");
          (window as any).__USER_ID__ = data.user?.id || "";
          setLoading(false);
        } else {
          router.push("/login");
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      (window as any).__USER_ROLE__ = userRole;
      (window as any).__USER_ID__ = "";
    }
  }, [loading, isAuthenticated, userRole]);

  // 关闭移动端菜单当路由变化
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function handleLogout() {
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  }

  function toggleMenu(label: string) {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // 渲染侧边栏内容（函数抽出方便复用）
  const SidebarContent = ({ collapsed = false, onChildClick }: { collapsed?: boolean; onChildClick?: () => void }) => (
    <nav className="py-4 px-2">
      <div className="space-y-1">
        {mainNavItems.map((item) => (
          <NavLinkItem
            key={item.label}
            item={item}
            collapsed={collapsed}
            expanded={!!expandedMenus[item.label]}
            userRole={userRole}
            pathname={pathname}
            onToggle={() => toggleMenu(item.label)}
            onChildClick={onChildClick}
          />
        ))}
      </div>

      <div className="my-4 border-t border-blue-800"></div>

      <div className="space-y-1">
        {settingsNavItems.map((item) => (
          <NavLinkItem
            key={item.label}
            item={item}
            collapsed={collapsed}
            expanded={!!expandedMenus[item.label]}
            userRole={userRole}
            pathname={pathname}
            onToggle={() => toggleMenu(item.label)}
            onChildClick={onChildClick}
          />
        ))}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* ===== 桌面端侧边栏（lg 及以上） ===== */}
      {/* 桌面端折叠按钮 */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-[#1e3a5f] text-white transition-all duration-300 z-30 overflow-y-auto ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo 区域 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-800 flex-shrink-0">
          <div className={`flex items-center gap-2 overflow-hidden transition-all ${sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
            <Image src="/logo.svg" alt="Logo" width={28} height={28} className="flex-shrink-0 rounded" />
            <span className="font-semibold text-sm whitespace-nowrap">通讯施工</span>
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded hover:bg-blue-800 transition-colors flex-shrink-0"
            title={sidebarCollapsed ? "展开" : "收起"}
          >
            <IconChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* ===== 移动端侧边栏 ===== */}
      {/* 移动端遮罩层 */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 移动端侧边栏（滑入） */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-[#1e3a5f] text-white z-40 flex flex-col transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo 区域 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={28} height={28} className="rounded" />
            <span className="font-semibold text-sm">通讯施工</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded hover:bg-blue-800 transition-colors"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarContent onChildClick={() => setMobileMenuOpen(false)} />
        </div>
      </aside>

      {/* ===== 主内容区 ===== */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-56"}`}>
        {/* 顶部导航栏 */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm">
          {/* 左侧：移动端 hamburger + 面包屑 */}
          <div className="flex items-center gap-3">
            {/* 移动端 hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <IconMenu className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* 右侧：用户信息 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">{username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              退出
            </button>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
