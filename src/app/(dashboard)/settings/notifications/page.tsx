"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  targetUserIds: string | null;
  createdBy: string | null;
  createdAt: number;
  creatorName?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "通知",
    targetMode: "all" as "all" | "specific",
  });
  const [users, setUsers] = useState<{ id: string; realName: string }[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/notifications").then((r) => r.json()),
      fetch("/api/settings/users").then((r) => r.json()),
    ])
      .then(([notifData, usersData]) => {
        if (notifData.success) setNotifications(notifData.data);
        if (usersData.success) setUsers(usersData.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: any = {
      title: form.title,
      content: form.content,
      type: form.type,
      targetUserIds: form.targetMode === "all" ? null : selectedUsers,
    };

    const res = await fetch("/api/settings/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      setShowAddForm(false);
      setForm({ title: "", content: "", type: "通知", targetMode: "all" });
      setSelectedUsers([]);
      const refresh = await fetch("/api/settings/notifications").then((r) => r.json());
      if (refresh.success) setNotifications(refresh.data);
    } else {
      setError(data.error);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该通知？")) return;
    await fetch("/api/settings/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "公告":
        return "bg-blue-100 text-blue-700";
      case "预警":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">通知管理</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showAddForm ? "取消" : "+ 发布通知"}
        </button>
      </div>

      {showAddForm && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">发布通知</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="通知">通知</option>
                  <option value="公告">公告</option>
                  <option value="预警">预警</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
              <textarea
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发送对象</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="targetMode"
                    checked={form.targetMode === "all"}
                    onChange={() => setForm({ ...form, targetMode: "all" })}
                  />
                  全员
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="targetMode"
                    checked={form.targetMode === "specific"}
                    onChange={() => setForm({ ...form, targetMode: "specific" })}
                  />
                  指定用户
                </label>
              </div>
              {form.targetMode === "specific" && (
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className={`px-3 py-1 rounded-lg border text-sm cursor-pointer ${
                        selectedUsers.includes(u.id)
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-white border-gray-200 text-gray-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selectedUsers.includes(u.id)}
                        onChange={() =>
                          setSelectedUsers((prev) =>
                            prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
                      />
                      {u.realName}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "发布中..." : "发布"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 通知列表 */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">暂无通知</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${typeColor(n.type)}`}>
                      {n.type}
                    </span>
                    <h3 className="font-medium text-gray-900">{n.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{n.creatorName || "系统"}</span>
                    <span>{new Date(n.createdAt).toLocaleString("zh-CN")}</span>
                    <span>
                      {n.targetUserIds ? "指定用户" : "全员"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-red-400 hover:text-red-600 text-sm ml-4"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
