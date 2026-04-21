/**
 * 权限验证中间件
 * 用于在 API 路由中验证用户是否有指定权限
 */

import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 权限点定义（与 roles API 保持一致）
const PERMISSION_GROUPS = {
  "物料管理": ["material:view", "material:create", "material:update", "material:delete"],
  "采购管理": ["purchase:view", "purchase:create", "purchase:update", "purchase:delete", "receipt:view", "receipt:create", "return:view", "return:create"],
  "出库管理": ["outbound:view", "outbound:create", "outbound:update", "outbound:delete", "returnOut:view", "returnOut:create"],
  "项目管理": ["project:view", "project:create", "project:update", "project:delete"],
  "仓储管理": ["warehouse:view", "inventory:view", "inbound:view", "outboundRecord:view", "adjust:view", "adjust:create", "flow:view", "check:view", "check:create", "check:confirm"],
  "经销商": ["distributor:view", "distributor:create", "distributor:update", "distributor:delete"],
  "供应商": ["supplier:view", "supplier:create", "supplier:update", "supplier:delete"],
  "人员管理": ["personnel:view", "personnel:create", "personnel:update", "personnel:delete", "health:view", "health:create", "credential:view", "credential:create"],
  "培训管理": ["training:view", "module:view", "module:create", "module:update", "module:delete", "exam:view", "exam:create", "exam:update", "exam:delete", "record:view"],
  "售后管理": ["afterSale:view", "complaint:view", "complaint:create", "service:view", "service:create"],
  "系统": ["report:view", "report:export", "settings:view", "user:view", "user:manage", "role:view", "role:manage"],
};

// 超级管理员权限
const SUPER_ADMIN_PERMISSIONS = Object.values(PERMISSION_GROUPS).flat();

/**
 * 获取用户权限列表
 */
async function getUserPermissions(userId: string, db: any): Promise<string[]> {
  // 获取用户信息
  const userResult = await db.prepare("SELECT role FROM users WHERE id = ?").bind(userId).all();
  if (!userResult.results || userResult.results.length === 0) {
    return [];
  }

  const userRole = userResult.results[0].role;

  // 超级管理员拥有所有权限
  if (userRole === "admin") {
    return SUPER_ADMIN_PERMISSIONS;
  }

  // 从 roles 表获取权限
  const roleResult = await db.prepare("SELECT permissions FROM roles WHERE id = ?").bind(userRole).all();
  if (!roleResult.results || roleResult.results.length === 0) {
    return [];
  }

  try {
    return JSON.parse(roleResult.results[0].permissions || "[]");
  } catch {
    return [];
  }
}

/**
 * 权限验证装饰器函数
 */
export function withPermission(
  requiredPermission: string,
  handler: (request: NextRequest, context: { userId: string; permissions: string[] }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 从 Cookie 获取用户信息
      const sessionCookie = request.cookies.get("session");
      if (!sessionCookie) {
        return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
      }

      let sessionData;
      try {
        sessionData = JSON.parse(decodeURIComponent(sessionCookie.value));
      } catch {
        return NextResponse.json({ success: false, error: "会话无效" }, { status: 401 });
      }

      const userId = sessionData.userId;
      if (!userId) {
        return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
      }

      // 获取用户权限
      const { env } = getCloudflareContext();
      const db = env.DB;

      if (!db) {
        return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
      }

      const permissions = await getUserPermissions(userId, db);

      // 验证权限
      if (!permissions.includes(requiredPermission)) {
        return NextResponse.json(
          { success: false, error: `没有权限: ${requiredPermission}` },
          { status: 403 }
        );
      }

      // 调用实际的处理函数
      return handler(request, { userId, permissions });
    } catch (error) {
      console.error("Permission check error:", error);
      return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
  };
}

/**
 * 验证用户是否有指定权限（供其他模块调用）
 */
export async function checkPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) return false;

    const permissions = await getUserPermissions(userId, db);
    return permissions.includes(permission);
  } catch {
    return false;
  }
}

/**
 * 获取用户可访问的菜单项
 */
export async function getUserMenuItems(userId: string): Promise<Record<string, string[]>> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) return {};

    const permissions = await getUserPermissions(userId, db);

    // 根据权限生成菜单配置
    const menuConfig: Record<string, { label: string; permissions: string[] }> = {
      "采购管理": { label: "采购管理", permissions: ["purchase:view", "receipt:view", "return:view"] },
      "出库管理": { label: "出库管理", permissions: ["outbound:view", "returnOut:view"] },
      "项目管理": { label: "项目管理", permissions: ["project:view"] },
      "仓储管理": { label: "仓储管理", permissions: ["warehouse:view", "inventory:view", "inbound:view", "outboundRecord:view", "adjust:view", "flow:view", "check:view"] },
      "档案管理": { label: "档案管理", permissions: ["distributor:view", "supplier:view", "material:view"] },
      "人员管理": { label: "人员管理", permissions: ["personnel:view", "health:view", "credential:view"] },
      "安规培训": { label: "安规培训", permissions: ["training:view", "module:view", "exam:view", "record:view"] },
      "售后管理": { label: "售后管理", permissions: ["afterSale:view", "complaint:view", "service:view"] },
      "设置": { label: "设置", permissions: ["settings:view", "user:view", "role:view", "report:view"] },
    };

    const result: Record<string, string[]> = {};
    for (const [key, config] of Object.entries(menuConfig)) {
      const hasAny = config.permissions.some(p => permissions.includes(p));
      if (hasAny) {
        result[key] = config.permissions;
      }
    }

    return result;
  } catch {
    return {};
  }
}
