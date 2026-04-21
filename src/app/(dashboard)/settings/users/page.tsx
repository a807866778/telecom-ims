"use client";

import { useEffect, useState, useCallback } from "react";

interface User {
  id: string;
  username: string;
  realName: string;
  phone: string | null;
  role: string;
  roleName: string;
  permissions: string[];
  status: string;
  expiresAt: number | null;
  createdAt: number;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isDefault: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState("user");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    realName: "",
    phone: "",
    role: "",
    expiresAt: "",
  });
  const [viewUser, setViewUser] = useState<User | null>(null); // 查看用户详情

  // 获取当前用户角色
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.role) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});
    const role = (window as any).__USER_ROLE__;
    if (role) setUserRole(role);
  }, []);

  const canManageUsers = userRole === "admin";

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/settings/users");
    const data = await res.json();
    if (data.success) setUsers(data.data);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/users").then((r) => r.json()),
      fetch("/api/roles").then((r) => r.json()),
    ])
      .then(([usersData, rolesData]) => {
        if (usersData.success) setUsers(usersData.data);
        if (rolesData.success) setRoles(rolesData.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  const resetForm = () => {
    setForm({ username: "", password: "", realName: "", phone: "", role: "", expiresAt: "" });
    setEditUser(null);
    setShowAddForm(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: any = { ...form };
    if (payload.expiresAt) {
      payload.expiresAt = new Date(payload.expiresAt).getTime();
    } else {
      payload.expiresAt = null;
    }

    const isEdit = !!editUser;
    const url = "/api/settings/users";
    const method = isEdit ? "PUT" : "POST";

    if (isEdit) {
      payload.id = editUser.id;
      if (!payload.password) delete payload.password; // 不修改密码时不传
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      resetForm();
      await fetchUsers();
    } else {
      setError(data.error);
    }
    setSaving(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("确定删除该用户？此操作不可撤销。")) return;
    const res = await fetch("/api/settings/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchUsers();
    } else {
      alert(data.error);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPwd = prompt("请输入新密码：");
    if (!newPwd) return;
    const res = await fetch("/api/settings/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newPassword: newPwd }),
    });
    const data = await res.json();
    if (data.success) {
      alert("密码已重置");
    } else {
      alert(data.error);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "disabled" : "active";
    const res = await fetch("/api/settings/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, status: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchUsers();
    }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      username: user.username,
      password: "",
      realName: user.realName,
      phone: user.phone || "",
      role: user.role,
      expiresAt: user.expiresAt ? new Date(user.expiresAt).toISOString().slice(0, 10) : "",
    });
    setShowAddForm(true);
  };

  const openView = (user: User) => {
    setViewUser(user);
  };

  const formatExpiry = (ts: number | null) => {
    if (!ts) return "永久";
    const d = new Date(ts);
    return d.toLocaleDateString("zh-CN");
  };

  const isExpired = (ts: number | null) => {
    if (!ts) return false;
    return Date.now() > ts;
  };

  // 获取角色名称
  const getRoleName = (roleId: string) => {
    if (roleId === "admin") return "超级管理员";
    const role = roles.find((r) => r.id === roleId);
    return role?.name || "普通用户";
  };

  // 获取角色权限标签
  const getRolePermissions = (user: User) => {
    if (user.role === "admin") return [{ key: "SUPER_ADMIN", label: "超级管理员" }];
    const role = roles.find((r) => r.id === user.role);
    if (!role) return [];
    return role.permissions.slice(0, 5).map((p) => ({ key: p, label: p }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="card p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">账号管理</h1>
        {canManageUsers && (
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 添加用户
          </button>
        )}
      </div>

      {/* 添加/编辑表单 */}
      {showAddForm && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">
              {editUser ? "编辑用户" : "添加用户"}
            </h2>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名 *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editUser}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editUser ? "新密码（留空不修改）" : "密码 *"}
                </label>
                <input
                  type="password"
                  required={!editUser}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editUser ? "留空则不修改" : ""}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.realName}
                  onChange={(e) => setForm({ ...form, realName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="">选择角色...</option>
                  <option value="admin">超级管理员</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  账号有效期
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">留空为永久有效</p>
              </div>
            </div>

            {/* 角色权限预览 */}
            {form.role && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  当前角色权限预览：
                </p>
                <div className="flex flex-wrap gap-1">
                  {form.role === "admin" ? (
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                      全部权限
                    </span>
                  ) : (
                    (roles.find((r) => r.id === form.role)?.permissions || []).map((p) => (
                      <span key={p} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        {p}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 用户列表 */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left">用户名</th>
                <th className="px-4 py-3 text-left">姓名</th>
                <th className="px-4 py-3 text-left">手机号</th>
                <th className="px-4 py-3 text-left">角色</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">有效期</th>
                <th className="px-4 py-3 text-left">创建时间</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{u.username}</td>
                  <td className="px-4 py-3">{u.realName}</td>
                  <td className="px-4 py-3 text-gray-500">{u.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openView(u)}
                      className="text-left hover:text-blue-600"
                    >
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          u.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {getRoleName(u.role)}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {canManageUsers ? (
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2 py-1 rounded text-xs cursor-pointer ${
                          u.status === "active"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {u.status === "active" ? "正常" : "已禁用"}
                      </button>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${
                        u.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {u.status === "active" ? "正常" : "已禁用"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.expiresAt ? (
                      <span
                        className={isExpired(u.expiresAt) ? "text-red-600 font-medium" : "text-gray-500"}
                      >
                        {formatExpiry(u.expiresAt)}
                        {isExpired(u.expiresAt) && " (已过期)"}
                      </span>
                    ) : (
                      <span className="text-gray-400">永久</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    {canManageUsers ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="text-orange-600 hover:text-orange-800 text-xs"
                        >
                          重置密码
                        </button>
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">无权限</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-8 text-center text-gray-400">暂无用户</div>
          )}
        </div>
      </div>

      {/* 用户详情弹窗 */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">用户详情</h2>
              <button onClick={() => setViewUser(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">用户名</span>
                  <p className="font-medium">{viewUser.username}</p>
                </div>
                <div>
                  <span className="text-gray-500">姓名</span>
                  <p className="font-medium">{viewUser.realName}</p>
                </div>
                <div>
                  <span className="text-gray-500">手机号</span>
                  <p className="font-medium">{viewUser.phone || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">状态</span>
                  <p className="font-medium">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      viewUser.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {viewUser.status === "active" ? "正常" : "已禁用"}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">有效期</span>
                  <p className="font-medium">{formatExpiry(viewUser.expiresAt)}</p>
                </div>
                <div>
                  <span className="text-gray-500">创建时间</span>
                  <p className="font-medium">
                    {new Date(viewUser.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-gray-500 text-sm">角色</span>
                <p className="font-medium mt-1">
                  <span className={`px-2 py-1 rounded text-xs ${
                    viewUser.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {getRoleName(viewUser.role)}
                  </span>
                </p>
              </div>

              <div>
                <span className="text-gray-500 text-sm">拥有的权限</span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {viewUser.role === "admin" ? (
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                      全部权限（超级管理员）
                    </span>
                  ) : (
                    (roles.find((r) => r.id === viewUser.role)?.permissions || []).map((p) => (
                      <span key={p} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded">
                        {p}
                      </span>
                    ))
                  )}
                </div>
                {viewUser.role !== "admin" && (roles.find((r) => r.id === viewUser.role)?.permissions || []).length === 0 && (
                  <p className="text-gray-400 text-sm mt-1">暂无权限</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
