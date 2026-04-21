import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";

// GET - 获取所有通知（管理视图）
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db
      .prepare(
        `SELECT n.*,
                (SELECT COUNT(*) FROM user_notifications un WHERE un.notification_id = n.id AND un.is_read = 0) as unread_count
         FROM notifications n
         ORDER BY n.created_at DESC`
      )
      .all();

    const notifications =
      result.results?.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        type: n.type,
        targetUsers: n.target_users,
        isRead: n.is_read === 1,
        unreadCount: n.unread_count,
        createdAt: n.created_at,
      })) || [];

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建通知（同时生成user_notifications记录）
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { title, content, type, targetUsers } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: "标题和内容不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO notifications (id, title, content, type, target_users, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, title, content, type || "system", targetUsers ? JSON.stringify(targetUsers) : null, now)
      .run();

    // 创建用户通知关联记录
    let userIds: string[] = [];
    if (targetUsers && Array.isArray(targetUsers) && targetUsers.length > 0) {
      userIds = targetUsers;
    } else {
      // 全员通知
      const usersResult = await db.prepare("SELECT id FROM users WHERE status = 'active'").all();
      userIds = usersResult.results?.map((u: any) => u.id) || [];
    }

    for (const userId of userIds) {
      const unId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO user_notifications (id, user_id, notification_id, is_read, created_at)
           VALUES (?, ?, ?, 0, ?)`
        )
        .bind(unId, userId, id, now)
        .run();
    }

    return NextResponse.json({ success: true, data: { id, targetCount: userIds.length } });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除通知
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
      return NextResponse.json({ success: false, error: "通知ID不能为空" }, { status: 400 });
    }

    await db.prepare("DELETE FROM user_notifications WHERE notification_id = ?").bind(id).run();
    await db.prepare("DELETE FROM notifications WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
