"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [humanVerified, setHumanVerified] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 前端验证检查
    if (!humanVerified) {
      setError("请先完成安全验证，点击「点击确认我是人类」按钮");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, humanVerified }),
      });

      const data = await response.json();

      if (data.success) {
        const link = document.createElement("a");
        link.href = "/dashboard";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
      } else {
        setError(data.error || "登录失败");
        setLoading(false);
        // 取消验证状态
        setHumanVerified(false);
      }
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧装饰区域 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1e3a5f] via-[#1a4a7a] to-[#0f2952] relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/10 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/10 rounded-full"></div>
        </div>

        {/* 内容 */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16 text-white h-full">
          <div className="flex items-center gap-4 mb-12">
            <Image src="/logo.svg" alt="Logo" width={56} height={56} />
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">通讯施工团队</h1>
              <p className="text-blue-200 text-base lg:text-lg">进存销管理系统</p>
            </div>
          </div>

          {/* 功能亮点 */}
          <div className="space-y-5">
            {[
              { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", title: "物料管理", desc: "精确的库存追踪与预警" },
              { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", title: "出入库管理", desc: "规范的流程与记录" },
              { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", title: "收益报表", desc: "清晰的经营数据分析" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-sm lg:text-base">{item.title}</h3>
                  <p className="text-blue-200 text-xs lg:text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image src="/logo.svg" alt="Logo" width={40} height={40} />
            <div>
              <h1 className="text-xl font-bold text-gray-900">通讯施工团队</h1>
              <p className="text-xs text-gray-500">进存销管理系统</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">欢迎登录</h2>
            <p className="text-sm text-gray-500 mb-8">请输入账号信息登录系统</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  账号
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  placeholder="请输入账号"
                  required
                  autoComplete="username"
                />
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  placeholder="请输入密码"
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* 人机验证 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  安全验证
                </label>
                <button
                  type="button"
                  onClick={() => setHumanVerified(true)}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    humanVerified
                      ? "bg-green-50 border-2 border-green-400 text-green-700"
                      : "bg-gray-50 border-2 border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {humanVerified ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      已确认，点击可重新验证
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      点击确认我是人类
                    </>
                  )}
                </button>
                {!humanVerified && (
                  <p className="text-xs text-gray-400 mt-1.5">请先完成安全验证</p>
                )}
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl font-medium hover:bg-[#1a4a7a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {loading ? "登录中..." : "登 录"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            通讯施工团队进存销管理系统 · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
