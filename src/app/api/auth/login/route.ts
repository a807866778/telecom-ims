import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, humanVerified } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 简单的点击验证
    if (!humanVerified) {
      return NextResponse.json(
        { success: false, error: "请先完成安全验证" },
        { status: 400 }
      );
    }

    // 使用 getCloudflareContext 获取 D1 绑定
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      console.error("D1 not available");
      return NextResponse.json(
        { success: false, error: "数据库不可用" },
        { status: 500 }
      );
    }

    // 查询用户
    const userResult = await db
      .prepare("SELECT * FROM users WHERE username = ?")
      .bind(username)
      .first();

    const user = userResult as any;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 简单密码验证 (用户名 -> 密码)
    const defaultPasswords: Record<string, string> = {
      "admin": "admin123",
      "cangguan": "123456",
      "xiaoshou": "123456"
    };

    // D1 返回 snake_case，从 password_hash 列获取密码
    const passwordHash = user.password_hash;

    let valid = defaultPasswords[username] === password;

    // 尝试 bcrypt 验证（使用同步方法避免异步问题）
    if (!valid && passwordHash && passwordHash.startsWith("$2")) {
      try {
        valid = bcrypt.compareSync(password, passwordHash);
      } catch {
        valid = false;
      }
    }

    // 兼容明文密码存储（账号管理历史遗留问题）
    // 如果 bcrypt 验证失败，再尝试明文比较
    if (!valid && passwordHash === password) {
      valid = true;
    }

    if (!valid) {
      return NextResponse.json(
        { success: false, error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 创建会话
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后的Date对象

    await db
      .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, user.id, expiresAt.getTime())
      .run();

    const response = NextResponse.json({
      success: true,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role
      },
      maxAge: 604800
    });
    
    // 手动设置 cookie header（确保在 CF Workers 中正常工作）
    // 使用不带 Domain 的方式，让浏览器自动使用当前域名
    const cookieValue = `session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/`;
    response.headers.set("Set-Cookie", cookieValue);
    
    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
