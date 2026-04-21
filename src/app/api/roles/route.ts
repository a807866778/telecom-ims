import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 获取所有权限点定义
const ALL_PERMISSIONS = [
  // 物料管理
  { key: "material:view", label: "查看物料", group: "物料管理" },
  { key: "material:create", label: "创建物料", group: "物料管理" },
  { key: "material:update", label: "编辑物料", group: "物料管理" },
  { key: "material:delete", label: "删除物料", group: "物料管理" },
  
  // 采购管理
  { key: "purchase:view", label: "查看采购", group: "采购管理" },
  { key: "purchase:create", label: "创建采购订单", group: "采购管理" },
  { key: "purchase:update", label: "编辑采购订单", group: "采购管理" },
  { key: "purchase:delete", label: "删除采购订单", group: "采购管理" },
  { key: "receipt:view", label: "查看采购收货", group: "采购管理" },
  { key: "receipt:create", label: "创建收货记录", group: "采购管理" },
  { key: "return:view", label: "查看采购退货", group: "采购管理" },
  { key: "return:create", label: "创建退货记录", group: "采购管理" },
  
  // 出库管理
  { key: "outbound:view", label: "查看出库", group: "出库管理" },
  { key: "outbound:create", label: "创建出库单", group: "出库管理" },
  { key: "outbound:update", label: "编辑出库单", group: "出库管理" },
  { key: "outbound:delete", label: "删除出库单", group: "出库管理" },
  { key: "returnOut:view", label: "查看退库单", group: "出库管理" },
  { key: "returnOut:create", label: "创建退库单", group: "出库管理" },
  
  // 项目管理
  { key: "project:view", label: "查看项目", group: "项目管理" },
  { key: "project:create", label: "创建项目", group: "项目管理" },
  { key: "project:update", label: "编辑项目", group: "项目管理" },
  { key: "project:delete", label: "删除项目", group: "项目管理" },
  
  // 仓储管理
  { key: "warehouse:view", label: "仓储概览", group: "仓储管理" },
  { key: "inventory:view", label: "查看库存", group: "仓储管理" },
  { key: "inbound:view", label: "查看入库记录", group: "仓储管理" },
  { key: "outboundRecord:view", label: "查看出库记录", group: "仓储管理" },
  { key: "adjust:view", label: "查看报溢报损", group: "仓储管理" },
  { key: "adjust:create", label: "创建调整", group: "仓储管理" },
  { key: "flow:view", label: "流向查询", group: "仓储管理" },
  { key: "check:view", label: "查看盘点", group: "仓储管理" },
  { key: "check:create", label: "创建盘点", group: "仓储管理" },
  { key: "check:confirm", label: "确认盘点", group: "仓储管理" },
  
  // 经销商管理
  { key: "distributor:view", label: "查看经销商", group: "经销商" },
  { key: "distributor:create", label: "创建经销商", group: "经销商" },
  { key: "distributor:update", label: "编辑经销商", group: "经销商" },
  { key: "distributor:delete", label: "删除经销商", group: "经销商" },
  
  // 供应商管理
  { key: "supplier:view", label: "查看供应商", group: "供应商" },
  { key: "supplier:create", label: "创建供应商", group: "供应商" },
  { key: "supplier:update", label: "编辑供应商", group: "供应商" },
  { key: "supplier:delete", label: "删除供应商", group: "供应商" },
  
  // 人员管理
  { key: "personnel:view", label: "查看人员", group: "人员管理" },
  { key: "personnel:create", label: "创建人员档案", group: "人员管理" },
  { key: "personnel:update", label: "编辑人员档案", group: "人员管理" },
  { key: "personnel:delete", label: "删除人员档案", group: "人员管理" },
  { key: "health:view", label: "查看健康档案", group: "人员管理" },
  { key: "health:create", label: "创建健康档案", group: "人员管理" },
  { key: "credential:view", label: "查看证照档案", group: "人员管理" },
  { key: "credential:create", label: "创建证照档案", group: "人员管理" },
  
  // 培训管理
  { key: "training:view", label: "培训概览", group: "培训管理" },
  { key: "module:view", label: "查看培训内容", group: "培训管理" },
  { key: "module:create", label: "创建培训内容", group: "培训管理" },
  { key: "module:update", label: "编辑培训内容", group: "培训管理" },
  { key: "module:delete", label: "删除培训内容", group: "培训管理" },
  { key: "exam:view", label: "查看考核", group: "培训管理" },
  { key: "exam:create", label: "创建考核题目", group: "培训管理" },
  { key: "exam:update", label: "编辑考核题目", group: "培训管理" },
  { key: "exam:delete", label: "删除考核题目", group: "培训管理" },
  { key: "record:view", label: "查看培训记录", group: "培训管理" },
  
  // 售后管理
  { key: "afterSale:view", label: "售后概览", group: "售后管理" },
  { key: "complaint:view", label: "查看客户投诉", group: "售后管理" },
  { key: "complaint:create", label: "创建投诉记录", group: "售后管理" },
  { key: "service:view", label: "查看设备售后", group: "售后管理" },
  { key: "service:create", label: "创建售后记录", group: "售后管理" },
  
  // 报表
  { key: "report:view", label: "查看报表", group: "系统" },
  { key: "report:export", label: "导出报表", group: "系统" },
  
  // 系统管理
  { key: "settings:view", label: "系统设置", group: "系统" },
  { key: "user:view", label: "查看用户", group: "系统" },
  { key: "user:manage", label: "管理用户", group: "系统" },
  { key: "role:view", label: "查看角色", group: "系统" },
  { key: "role:manage", label: "管理角色", group: "系统" },
];

// GET - 获取所有角色 / 获取权限定义
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    // 返回权限定义
    if (type === "permissions") {
      // 按组分类权限
      const grouped = ALL_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.group]) acc[perm.group] = [];
        acc[perm.group].push({ key: perm.key, label: perm.label });
        return acc;
      }, {} as Record<string, { key: string; label: string }[]>);

      return NextResponse.json({ success: true, data: grouped });
    }

    // 返回角色列表
    const result = await db.prepare("SELECT * FROM roles ORDER BY created_at ASC").all();
    const roles = result.results?.map((r: any) => ({
      id: r.id,
      name: r.name,
      permissions: JSON.parse(r.permissions || "[]"),
      isDefault: !!r.is_default,
      createdAt: r.created_at,
    })) || [];

    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error("Roles API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建角色
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { name, permissions = [], isDefault = false } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "角色名称不能为空" }, { status: 400 });
    }

    // 检查角色名是否重复
    const existResult = await db.prepare("SELECT id FROM roles WHERE name = ?").bind(name).all();
    if (existResult.results && existResult.results.length > 0) {
      return NextResponse.json({ success: false, error: "角色名称已存在" }, { status: 400 });
    }

    // 验证权限点是否合法
    const validKeys = ALL_PERMISSIONS.map(p => p.key);
    const invalidPerms = permissions.filter((p: string) => !validKeys.includes(p));
    if (invalidPerms.length > 0) {
      return NextResponse.json({ success: false, error: `无效的权限: ${invalidPerms.join(", ")}` }, { status: 400 });
    }

    const id = `role-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();

    await db.prepare(`
      INSERT INTO roles (id, name, permissions, is_default, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, name, JSON.stringify(permissions), isDefault ? 1 : 0, now).run();

    return NextResponse.json({ success: true, data: { id, name, permissions, isDefault } });
  } catch (error) {
    console.error("Create role error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新角色
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, name, permissions, isDefault } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "角色ID不能为空" }, { status: 400 });
    }

    // 检查角色是否存在
    const existResult = await db.prepare("SELECT id, name FROM roles WHERE id = ?").bind(id).all();
    if (!existResult.results || existResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "角色不存在" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      // 检查名称是否与其他角色重复
      const dupResult = await db.prepare("SELECT id FROM roles WHERE name = ? AND id != ?").bind(name, id).all();
      if (dupResult.results && dupResult.results.length > 0) {
        return NextResponse.json({ success: false, error: "角色名称已存在" }, { status: 400 });
      }
      updates.push("name = ?");
      values.push(name);
    }

    if (permissions !== undefined) {
      // 验证权限点
      const validKeys = ALL_PERMISSIONS.map(p => p.key);
      const invalidPerms = permissions.filter((p: string) => !validKeys.includes(p));
      if (invalidPerms.length > 0) {
        return NextResponse.json({ success: false, error: `无效的权限: ${invalidPerms.join(", ")}` }, { status: 400 });
      }
      updates.push("permissions = ?");
      values.push(JSON.stringify(permissions));
    }

    if (isDefault !== undefined) {
      updates.push("is_default = ?");
      values.push(isDefault ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "没有需要更新的字段" }, { status: 400 });
    }

    values.push(id);
    await db.prepare(`UPDATE roles SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除角色
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "角色ID不能为空" }, { status: 400 });
    }

    // 检查是否为默认角色
    const existResult = await db.prepare("SELECT is_default FROM roles WHERE id = ?").bind(id).all();
    if (!existResult.results || existResult.results.length === 0) {
      return NextResponse.json({ success: false, error: "角色不存在" }, { status: 404 });
    }

    if (existResult.results[0].is_default) {
      return NextResponse.json({ success: false, error: "默认角色不能删除" }, { status: 400 });
    }

    // 检查是否有用户使用该角色
    const userCountResult = await db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role_id = ?").bind(id).all();
    if (userCountResult.results && userCountResult.results[0].cnt > 0) {
      return NextResponse.json({ success: false, error: `该角色被 ${userCountResult.results[0].cnt} 个用户使用，无法删除` }, { status: 400 });
    }

    await db.prepare("DELETE FROM roles WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete role error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
