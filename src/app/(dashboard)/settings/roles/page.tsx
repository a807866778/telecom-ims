"use client";

import { useEffect, useState, useCallback } from "react";

interface Permission {
  key: string;
  label: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isDefault: boolean;
  createdAt: number;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [form, setForm] = useState({
    name: "",
    permissions: [] as string[],
    isDefault: false,
  });

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

  const canManageRoles = userRole === "admin";

  const fetchData = useCallback(async () => {
    const [rolesRes, permsRes] = await Promise.all([
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/roles?type=permissions").then((r) => r.json()),
    ]);
    if (rolesRes.success) setRoles(rolesRes.data);
    if (permsRes.success) setPermissions(permsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm({ name: "", permissions: [], isDefault: false });
    setEditRole(null);
    setShowAddForm(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = "/api/roles";
    const method = editRole ? "PUT" : "POST";
    const payload = {
      ...form,
      ...(editRole ? { id: editRole.id } : {}),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      resetForm();
      await fetchData();
    } else {
      setError(data.error);
    }
    setSaving(false);
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm("确定删除该角色？")) return;
    const res = await fetch("/api/roles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: roleId }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchData();
    } else {
      alert(data.error);
    }
  };

  const openEdit = (role: Role) => {
    setEditRole(role);
    setForm({
      name: role.name,
      permissions: role.permissions,
      isDefault: role.isDefault,
    });
    setShowAddForm(true);
  };

  const togglePermission = (permKey: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter((p) => p !== permKey)
        : [...prev.permissions, permKey],
    }));
  };

  const selectAllInGroup = (group: string) => {
    const groupPerms = permissions[group]?.map((p) => p.key) || [];
    const allSelected = groupPerms.every((p) => form.permissions.includes(p));
    setForm((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !groupPerms.includes(p))
        : [...new Set([...prev.permissions, ...groupPerms])],
    }));
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
        <h1 className="text-xl font-semibold text-gray-900">角色权限管理</h1>
        {canManageRoles && (
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 创建角色
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        创建角色并配置权限，然后可以将角色分配给用户。用户将继承该角色的所有权限。
      </p>

      {/* 添加/编辑表单 */}
      {showAddForm && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">
              {editRole ? "编辑角色" : "创建角色"}
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
                  角色名称 *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editRole?.isDefault}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：仓库管理员"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!!editRole?.isDefault}
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-600">默认角色（新用户自动分配）</span>
                </label>
              </div>
            </div>

            {/* 权限配置 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">
                  权限配置
                </label>
                <span className="text-xs text-gray-400">
                  已选 {form.permissions.length} 项
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(permissions).map(([group, perms]) => (
                  <div key={group} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-gray-700">{group}</h3>
                      <button
                        type="button"
                        onClick={() => selectAllInGroup(group)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        全选/取消
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {perms.map((perm) => (
                        <label
                          key={perm.key}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(perm.key)}
                            onChange={() => togglePermission(perm.key)}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span className="text-xs text-gray-600">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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

      {/* 角色列表 */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <div key={role.id} className="card p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{role.name}</h3>
                  {role.isDefault && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                      默认
                    </span>
                  )}
                  {role.id === "role-admin" && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                      超级管理员
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {role.permissions.length} 项权限
                </p>
              </div>
              {canManageRoles && !role.isDefault && role.id !== "role-admin" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(role)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>

            {/* 权限展示 */}
            <div className="flex flex-wrap gap-1">
              {role.permissions.map((perm) => (
                <span
                  key={perm}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  {perm}
                </span>
              ))}
              {role.permissions.length === 0 && (
                <span className="text-gray-400 text-xs">暂无权限</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="card p-8 text-center text-gray-400">
          暂无角色，请点击"创建角色"开始配置
        </div>
      )}
    </div>
  );
}
