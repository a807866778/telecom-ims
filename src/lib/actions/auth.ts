"use server";

import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users, sessions } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7天

// 获取数据库实例
async function getDatabase() {
  // 在 Next.js App Router 中，我们需要从 context 获取
  // 但这里是在 action 中，所以尝试从全局获取
  const db = getDb();
  if (!db) {
    console.error("Database not available");
    throw new Error("Database not available");
  }
  return db;
}

export async function login(username: string, password: string) {
  try {
    const db = await getDatabase();
    
    // 查询用户
    const userResult = await db.select().from(users).where(eq(users.username, username));
    const user = userResult[0];

    if (!user) {
      return { success: false, error: "用户名或密码错误" };
    }

    // 简单密码验证（临时方案）
    // 实际生产环境应使用 bcrypt
    const validPasswords: Record<string, string> = {
      "admin": "admin123",
      "cangguan": "123456",
      "xiaoshou": "123456"
    };

    let valid = false;
    if (validPasswords[password] && validPasswords[password] === password) {
      valid = true;
    }
    
    // 如果上面的验证失败，尝试 bcrypt
    if (!valid) {
      try {
        const bcrypt = await import("bcryptjs");
        valid = await bcrypt.compare(password, user.passwordHash);
      } catch {
        valid = false;
      }
    }

    if (!valid) {
      return { success: false, error: "用户名或密码错误" };
    }

    // 创建会话
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    revalidatePath("/");
    
    return { 
      success: true, 
      sessionId,
      maxAge: SESSION_DURATION / 1000 
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, error: `服务器错误: ${error?.message || "请重试"}` };
  }
}

export async function logout() {
  try {
    const db = await getDatabase();
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      cookieStore.delete("session_id");
    }
    
    revalidatePath("/");
    redirect("/login");
  } catch (error) {
    console.error("Logout error:", error);
    redirect("/login");
  }
}
