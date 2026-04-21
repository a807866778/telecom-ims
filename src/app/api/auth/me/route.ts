import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  // 从请求头中获取 cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/session_id=([^;]+)/);
  const sessionId = match ? match[1] : null;

  if (!sessionId) {
    return NextResponse.json({ hasCookie: false, sessionId: null });
  }

  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ hasCookie: false, sessionId: null });
    }

    // 查找会话对应的用户
    const sessionResult = await db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first();

    if (!sessionResult) {
      return NextResponse.json({ hasCookie: false, sessionId: null });
    }

    // 检查会话是否过期
    if (sessionResult.expires_at < Date.now()) {
      // 删除过期会话
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
      return NextResponse.json({ hasCookie: false, sessionId: null });
    }

    // 获取用户信息
    const userResult = await db
      .prepare("SELECT id, username, real_name, role FROM users WHERE id = ?")
      .bind(sessionResult.user_id)
      .first();

    if (!userResult) {
      return NextResponse.json({ hasCookie: false, sessionId: null });
    }

    return NextResponse.json({
      hasCookie: true,
      sessionId,
      user: {
        id: userResult.id,
        username: userResult.username,
        realName: userResult.real_name,
        role: userResult.role || "user"
      }
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ hasCookie: false, sessionId: null });
  }
}
