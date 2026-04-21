"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

interface DashboardData {
  totalMaterials: number;
  activeProjects: number;
  todayRevenue: number;
  todayCost: number;
  todayInbounds: number;
  todayOutbounds: number;
  lowStockMaterials: LowStockItem[];
  recentOutbounds: RecentOutbound[];
  periodProfit: number;
  periodRevenue: number;
  periodCost: number;
  periodLabel: string;
  period: string;
}

interface LowStockItem {
  id: string;
  name: string;
  spec?: string;
  unit: string;
  stockQuantity: number;
  minStockWarning: number;
  categoryName: string;
}

interface RecentOutbound {
  id: string;
  projectName: string;
  createdAt: string;
}

interface Todo {
  id: string;
  title: string;
  type: "urgent" | "pending" | "normal";
  dueDate?: string;
  completed: boolean;
}

// 根据利润返回鼓励语
function getEncouragement(profit: number, label: string): { text: string; emoji: string } {
  if (profit > 100000) return { text: `${label}大丰收！利润破十万，继续冲！`, emoji: "🚀" };
  if (profit > 50000) return { text: `${label}收益亮眼！稳住，继续发力！`, emoji: "🎉" };
  if (profit > 10000) return { text: `${label}进账不错，积少成多，加油！`, emoji: "💪" };
  if (profit > 0) return { text: `${label}有盈余，每一分利润都是努力的结晶！`, emoji: "✨" };
  if (profit === 0) return { text: `${label}收支平衡，明天会更好！`, emoji: "😊" };
  return { text: `${label}略有亏损，分析原因，下次加油！`, emoji: "💡" };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const periodRef = useRef(period); // 用于在闭包中获取最新的 period 值

  // 保持 periodRef 与 period 同步
  useEffect(() => {
    periodRef.current = period;
  }, [period]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hitokoto, setHitokoto] = useState<{ text: string; author: string } | null>(null);
  const [username, setUsername] = useState("管理员");

  // 获取当前用户
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUsername(d.user.realName || d.user.username || "管理员");
        }
      })
      .catch(() => {});
  }, []);

  // 获取一言
  useEffect(() => {
    fetch("https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=e&c=f&c=g&c=h&c=i&c=j&c=k&c=l&c=m&c=n&c=o&c=p&c=q&c=r&c=s&c=t&c=u&c=v&c=w&c=x&c=y&c=z&encode=json&charset=utf-8")
      .then(r => r.json())
      .then(d => setHitokoto({ text: d.hitokoto || "行动是治愈恐惧的良药。", author: d.creator || "匿名" }))
      .catch(() => setHitokoto({ text: "行动是治愈恐惧的良药。", author: "匿名" }));
  }, []);

  // 待办表单状态
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoType, setTodoType] = useState<"urgent" | "pending" | "normal">("normal");
  const [todoDueDate, setTodoDueDate] = useState("");

  // 获取仪表盘数据
  const fetchDashboard = useCallback(async (isPeriodSwitch = false, periodToFetch?: string) => {
    // 优先使用传入的 period，否则使用 ref 中的最新值
    const currentPeriod = periodToFetch || periodRef.current;
    try {
      if (isPeriodSwitch) {
        setPeriodLoading(true);
      } else {
        setLoading(true);
      }
      const res = await fetch(`/api/dashboard?period=${currentPeriod}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setPeriodLoading(false);
      setLoading(false);
    }
  }, []); // 空依赖，fetchDashboard 不会因为状态变化而重新创建

  // 获取待办列表
  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos");
      const json = await res.json();
      if (json.success) {
        setTodos(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch todos:", e);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(false);
    fetchTodos();
  }, [fetchDashboard, fetchTodos]);

  // 添加待办
  const handleAddTodo = async () => {
    if (!todoTitle.trim()) return;
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: todoTitle,
          type: todoType,
          dueDate: todoDueDate || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTodos((prev) => [json.data, ...prev]);
        setShowTodoModal(false);
        setTodoTitle("");
        setTodoType("normal");
        setTodoDueDate("");
      }
    } catch (e) {
      console.error("Failed to add todo:", e);
    }
  };

  // 更新待办完成状态
  const handleUpdateTodo = async (id: string, updates: Partial<Todo>) => {
    try {
      const res = await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const json = await res.json();
      if (json.success) {
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
      }
    } catch (e) {
      console.error("Failed to update todo:", e);
    }
  };

  // 删除待办
  const handleDeleteTodo = async (id: string) => {
    if (!confirm("确定要删除这条待办吗？")) return;
    try {
      const res = await fetch(`/api/todos?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete todo:", e);
    }
  };

  // 格式化金额
  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 10000) {
      return (amount / 10000).toFixed(1) + "万";
    }
    return amount.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
  };

  // 获取待办徽章
  const getTodoBadge = (type: Todo["type"]) => {
    switch (type) {
      case "urgent":
        return <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">紧急</span>;
      case "pending":
        return <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">待办</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">普通</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">数据加载失败</p>
          <button
            onClick={() => fetchDashboard(false)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const encouragement = getEncouragement(data.periodProfit, data.periodLabel);

  return (
    <div className="space-y-5">
      {/* 欢迎区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              欢迎回来，{username}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {new Date().toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </p>
            {hitokoto && (
              <div className="mt-3 flex items-center gap-2 max-w-md">
                <svg className="w-4 h-4 text-[#1e3a5f] flex-shrink-0 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                </svg>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {hitokoto.text}
                  <span className="text-gray-400 ml-1">—— {hitokoto.author}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 利润卡片 - 置顶 */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a5298] rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-white/70 text-sm">
                {period === "day" ? "今日" : period === "month" ? "本月" : "本年"}利润
              </span>
              <div className="flex gap-1">
                {(["day", "month", "year"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={periodLoading}
                    onClick={() => {
                      setPeriod(p);
                      fetchDashboard(true, p); // 传递新的 period 值
                    }}
                    className={`px-2.5 py-0.5 text-xs rounded-full transition-colors ${
                      period === p
                        ? "bg-white text-[#1e3a5f] font-semibold"
                        : "bg-white/20 text-white hover:bg-white/30"
                    } ${periodLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {p === "day" ? "今日" : p === "month" ? "本月" : "本年"}
                  </button>
                ))}
              </div>
            </div>
            {periodLoading ? (
              <div className="space-y-2">
                <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                <div className={`text-4xl font-bold ${data.periodProfit >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {data.periodProfit >= 0 ? "+" : ""}¥{formatCurrency(data.periodProfit)}
                </div>
                <div className="flex gap-4 mt-2 text-white/60 text-xs">
                  <span>营收 ¥{formatCurrency(data.periodRevenue)}</span>
                  <span>成本 ¥{formatCurrency(data.periodCost)}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-4 max-w-xs">
            <span className="text-3xl">{encouragement.emoji}</span>
            <p className="text-white text-sm leading-relaxed">{encouragement.text}</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 进行中项目 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#1e3a5f]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500">进行中项目</p>
            <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.activeProjects}</p>
          <Link href="/projects" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">
            查看全部 →
          </Link>
        </div>

        {/* 安规培训 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#1e3a5f]" onClick={() => window.location.href = "/training/content"}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500">安规培训</p>
            <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">学习</p>
          <span className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">
            进入培训 →
          </span>
        </div>

        {/* 今日入库 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#1e3a5f]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500">今日入库</p>
            <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.todayInbounds}</p>
          <Link href="/warehouse/inbound/records" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">
            查看记录 →
          </Link>
        </div>

        {/* 今日出库 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#1e3a5f]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500">今日出库</p>
            <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.todayOutbounds}</p>
          <Link href="/warehouse/outbound/records" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">
            查看记录 →
          </Link>
        </div>
      </div>

      {/* 底部区域：待办(窄) + 快捷+出库+预警(宽) */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* 待办事项 - 压缩为1列 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">待办事项</h2>
            <button
              onClick={() => {
                setTodoTitle("");
                setTodoType("normal");
                setTodoDueDate("");
                setShowTodoModal(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + 添加
            </button>
          </div>
          <div className="p-3 max-h-[220px] overflow-y-auto">
            {todos.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-sm">暂无待办</p>
                <button
                  onClick={() => setShowTodoModal(true)}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  点击添加 →
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {todos.slice(0, 6).map((todo) => (
                  <div
                    key={todo.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors ${
                      todo.completed ? "opacity-50" : ""
                    }`}
                  >
                    <button
                      onClick={() => handleUpdateTodo(todo.id, { completed: !todo.completed })}
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-2 transition-colors ${
                        todo.completed
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 hover:border-blue-500"
                      }`}
                    >
                      {todo.completed && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`text-xs flex-1 truncate ${todo.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {todo.title}
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      {getTodoBadge(todo.type)}
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：快捷操作 + 近期出库 + 库存预警 */}
        <div className="lg:col-span-3 space-y-4">
          {/* 快捷操作 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">快捷操作</h2>
            <div className="grid grid-cols-4 gap-2">
              {[
                { href: "/purchase/orders/new", label: "新增采购", color: "bg-[#1e3a5f]/10 text-[#1e3a5f]" },
                { href: "/projects/new", label: "新建项目", color: "bg-[#1e3a5f]/10 text-[#1e3a5f]" },
                { href: "/inbound/new", label: "入库登记", color: "bg-[#1e3a5f]/10 text-[#1e3a5f]" },
                { href: "/outbound/new", label: "出库登记", color: "bg-[#1e3a5f]/10 text-[#1e3a5f]" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${item.color} hover:opacity-80 transition-opacity`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 近期出库 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">近期出库</h2>
              <Link href="/warehouse/outbound/records" className="text-xs text-blue-600 hover:text-blue-700">
                查看全部 →
              </Link>
            </div>
            <div className="space-y-2">
              {data.recentOutbounds.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-700 truncate flex-1">{item.projectName}</span>
                  <span className="text-xs text-gray-400 ml-2">{item.createdAt}</span>
                </div>
              ))}
              {data.recentOutbounds.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">暂无出库记录</p>
              )}
            </div>
          </div>

          {/* 库存预警 */}
          {data.lowStockMaterials.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="font-semibold text-gray-900 text-sm">库存预警</h2>
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                    {data.lowStockMaterials.length}
                  </span>
                </div>
                <Link href="/warehouse/inventory" className="text-xs text-blue-600 hover:text-blue-700">
                  查看全部
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {data.lowStockMaterials.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 border border-orange-100"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.spec || item.categoryName}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="text-xs font-bold text-orange-600">{item.stockQuantity}{item.unit}</div>
                      <div className="text-xs text-gray-400">预警:{item.minStockWarning}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 添加待办弹窗 */}
      {showTodoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">添加待办事项</h3>
              <button
                onClick={() => setShowTodoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  placeholder="输入待办事项..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <div className="flex gap-2">
                  {(["normal", "pending", "urgent"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTodoType(t)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        todoType === t
                          ? t === "urgent"
                            ? "bg-red-100 text-red-700"
                            : t === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t === "urgent" ? "紧急" : t === "pending" ? "待办" : "普通"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">截止日期（可选）</label>
                <input
                  type="date"
                  value={todoDueDate}
                  onChange={(e) => setTodoDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowTodoModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleAddTodo}
                disabled={!todoTitle.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
