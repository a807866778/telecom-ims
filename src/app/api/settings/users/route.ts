import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 权限验证：需要 user:view 或 user:manage 权限
async function checkPermission(request: NextRequest): Promise<{ hasPermission: boolean; userId: string }> {
  // 从 cookie 中获取 session_id
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/session_id=([^;]+)/);
  const sessionId = match ? match[1] : null;
  
  if (!sessionId) {
    return { hasPermission: false, userId: "" };
  }

  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return { hasPermission: false, userId: "" };
    }

    // 查找会话
    const sessionResult = await db.prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?").bind(sessionId).first();
    if (!sessionResult) {
      return { hasPermission: false, userId: "" };
    }

    // 检查会话是否过期
    if ((sessionResult as any).expires_at < Date.now()) {
      return { hasPermission: false, userId: "" };
    }

    const userId = (sessionResult as any).user_id;

    // 获取用户角色
    const userResult = await db.prepare("SELECT role FROM users WHERE id = ?").bind(userId).first();
    if (!userResult) {
      return { hasPermission: false, userId: "" };
    }

    const userRole = (userResult as any).role;

    // admin 拥有所有权限
    if (userRole === "admin") {
      return { hasPermission: true, userId };
    }

    // 获取用户角色对应的权限
    const roleResult = await db.prepare("SELECT permissions FROM roles WHERE id = ?").bind(userRole).all();
    if (!roleResult.results || roleResult.results.length === 0) {
      return { hasPermission: false, userId: "" };
    }

    const permissions = JSON.parse((roleResult.results[0] as any).permissions || "[]");
    const hasPermission = permissions.includes("user:view") || permissions.includes("user:manage");

    return { hasPermission, userId };
  } catch {
    return { hasPermission: false, userId: "" };
  }
}

// GET - 获取所有用户
export async function GET(request: NextRequest) {
  try {
    const { hasPermission, userId } = await checkPermission(request);
    
    if (!hasPermission) {
      return NextResponse.json({ success: false, error: "没有权限" }, { status: 403 });
    }

    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    // 修复：users.role 存的是 "admin" 或 "user"，roles.id 存的是 "role-admin"，需要分开查询
    // 先从 roles 表获取所有角色
    const rolesResult = await db.prepare("SELECT id, name, permissions FROM roles").all();
    const rolesMap: Record<string, { name: string; permissions: string }> = {};
    (rolesResult.results || []).forEach((r: any) => {
      rolesMap[r.id] = r;
    });

    // 查询所有用户
    const usersResult = await db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();

    const users = usersResult.results?.map((u: any) => {
      // 检查 users.role 是否匹配 roles 表的 id
      const roleInfo = rolesMap[u.role];
      return {
        id: u.id,
        username: u.username,
        realName: u.real_name,
        phone: u.phone,
        role: u.role,
        roleName: roleInfo?.name || (u.role === "admin" ? "超级管理员" : "普通用户"),
        permissions: u.role === "admin" ? ["SUPER_ADMIN"] : (roleInfo ? JSON.parse(roleInfo.permissions || "[]") : []),
        status: u.status,
        expiresAt: u.expires_at,
        createdAt: u.created_at,
      };
    }) || [];

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Users API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建用户
export async function POST(request: NextRequest) {
  try {
    const { hasPermission } = await checkPermission(request);
    
    if (!hasPermission) {
      return NextResponse.json({ success: false, error: "没有权限" }, { status: 403 });
    }

    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { username, password, realName, phone, role, expiresAt } = body;

    if (!username || !password || !realName) {
      return NextResponse.json({ success: false, error: "用户名、密码和姓名不能为空" }, { status: 400 });
    }

    // 检查用户名是否存在
    const existResult = await db.prepare("SELECT id FROM users WHERE username = ?").bind(username).all();
    if (existResult.results && existResult.results.length > 0) {
      return NextResponse.json({ success: false, error: "用户名已存在" }, { status: 400 });
    }

    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();

    // 简单哈希密码（实际应该用bcrypt）
    const passwordHash = password; // TODO: 使用真正的哈希

    await db.prepare(`
      INSERT INTO users (id, username, password_hash, real_name, phone, role, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, username, passwordHash, realName, phone || null, role || "user", "active", expiresAt || null, now).run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新用户
export async function PUT(request: NextRequest) {
  try {
    const { hasPermission } = await checkPermission(request);
    
    if (!hasPermission) {
      return NextResponse.json({ success: false, error: "没有权限" }, { status: 403 });
    }

    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, username, password, realName, phone, role, status, expiresAt } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "用户ID不能为空" }, { status: 400 });
    }

    // 检查用户是否存在
    const existResult = await db.prepare("SELECT id FROM users WHERE id = ?").bind(id).all();
    if (!existResult.results || existResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (username !== undefined) {
      // 检查用户名是否与其他用户重复
      const dupResult = await db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").bind(username, id).all();
      if (dupResult.results && dupResult.results.length > 0) {
        return NextResponse.json({ success: false, error: "用户名已存在" }, { status: 400 });
      }
      updates.push("username = ?");
      values.push(username);
    }

    if (password) {
      const passwordHash = password;
      updates.push("password_hash = ?");
      values.push(passwordHash);
    }

    if (realName !== undefined) {
      updates.push("real_name = ?");
      values.push(realName);
    }

    if (phone !== undefined) {
      updates.push("phone = ?");
      values.push(phone || null);
    }

    if (role !== undefined) {
      updates.push("role = ?");
      values.push(role);
    }

    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }

    if (expiresAt !== undefined) {
      updates.push("expires_at = ?");
      values.push(expiresAt);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "没有需要更新的字段" }, { status: 400 });
    }

    values.push(id);
    await db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const { hasPermission } = await checkPermission(request);
    
    if (!hasPermission) {
      return NextResponse.json({ success: false, error: "没有权限" }, { status: 403 });
    }

    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "用户ID不能为空" }, { status: 400 });
    }

    // 检查用户是否存在
    const existResult = await db.prepare("SELECT id, role FROM users WHERE id = ?").bind(id).all();
    if (!existResult.results || existResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });
    }

    // 不能删除超级管理员
    if (existResult.results[0].role === "admin") {
      return NextResponse.json({ success: false, error: "不能删除超级管理员" }, { status: 400 });
    }

    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
