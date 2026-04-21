/**
 * 权限验证辅助函数
 * 提供在 API 路由中验证用户权限的通用方法
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * 权限上下文接口
 */
export interface PermissionContext {
  userId: string;
  role: string;
  permissions: string[];
}

/**
 * 获取用户权限上下文
 */
export async function getPermissionContext(request: NextRequest): Promise<PermissionContext | null> {
  try {
    // 从 cookie 中获取 session_id
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/session_id=([^;]+)/);
    const sessionId = match ? match[1] : null;
    
    if (!sessionId) {
      return null;
    }

    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return null;
    }

    // 查找会话
    const sessionResult = await db.prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?").bind(sessionId).first();
    if (!sessionResult) {
      return null;
    }

    // 检查会话是否过期
    if ((sessionResult as any).expires_at < Date.now()) {
      return null;
    }

    const userId = (sessionResult as any).user_id;

    // 获取用户角色
    const userResult = await db.prepare("SELECT role, status, expires_at FROM users WHERE id = ?").bind(userId).first();
    if (!userResult) {
      return null;
    }

    const user = userResult as any;
    
    // 检查账号是否被禁用
    if (user.status === "disabled") {
      return null;
    }
    
    // 检查账号是否过期
    if (user.expires_at && user.expires_at < Date.now()) {
      return null;
    }

    // 超级管理员拥有所有权限
    if (user.role === "admin") {
      return {
        userId,
        role: "admin",
        permissions: ["SUPER_ADMIN"], // 特殊标记表示拥有所有权限
      };
    }

    // 获取用户角色的权限
    const roleResult = await db.prepare("SELECT permissions FROM roles WHERE id = ?").bind(user.role).all();
    if (!roleResult.results || roleResult.results.length === 0) {
      return {
        userId,
        role: user.role,
        permissions: [],
      };
    }

    const permissions = JSON.parse((roleResult.results[0] as any).permissions || "[]");
    
    return {
      userId,
      role: user.role,
      permissions,
    };
  } catch {
    return null;
  }
}

/**
 * 验证是否有权限
 */
export function hasPermission(ctx: PermissionContext | null, required: string): boolean {
  if (!ctx) return false;
  
  // 超级管理员拥有所有权限
  if (ctx.role === "admin" || ctx.permissions.includes("SUPER_ADMIN")) {
    return true;
  }
  
  return ctx.permissions.includes(required);
}

/**
 * 创建需要权限验证的 GET 处理器
 */
export function requirePermission(
  requiredPermission: string,
  handler: (request: NextRequest, ctx: PermissionContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const ctx = await getPermissionContext(request);
    
    if (!ctx) {
      return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
    }
    
    if (!hasPermission(ctx, requiredPermission)) {
      return NextResponse.json(
        { success: false, error: `没有权限: ${requiredPermission}` },
        { status: 403 }
      );
    }
    
    return handler(request, ctx);
  };
}

/**
 * 权限验证中间件（用于包装整个 API 路由）
 */
export async function withPermission(
  request: NextRequest,
  requiredPermission: string
): Promise<{ authorized: boolean; ctx: PermissionContext | null }> {
  const ctx = await getPermissionContext(request);
  
  if (!ctx) {
    return { authorized: false, ctx: null };
  }
  
  if (!hasPermission(ctx, requiredPermission)) {
    return { authorized: false, ctx };
  }
  
  return { authorized: true, ctx };
}
