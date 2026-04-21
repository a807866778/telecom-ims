import { cookies } from "next/headers";
import { db, schema } from "@/lib/db";
import { eq, and, gt } from "@/lib/db/queries";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7天

export interface SessionUser {
  id: string;
  username: string;
  realName: string;
  permissions: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(schema.sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  return sessionId;
}

export async function getSession(sessionId: string): Promise<SessionUser | null> {
  try {
    const session = await db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.id, sessionId), gt(schema.sessions.expiresAt, new Date())))
      .get();

    if (!session) return null;

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .get();

    if (!user) return null;

    const userRoleRecords = await db
      .select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, user.id));

    const permissions: string[] = [];
    for (const ur of userRoleRecords) {
      const role = await db
        .select()
        .from(schema.roles)
        .where(eq(schema.roles.id, ur.roleId))
        .get();
      if (role) {
        const rolePerms = JSON.parse(role.permissions) as string[];
        permissions.push(...rolePerms);
      }
    }

    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      permissions: Array.from(new Set(permissions)),
    };
  } catch {
    return null;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) return null;
  return getSession(sessionId);
}

export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .get();

  if (!user) {
    return { success: false, error: "用户名或密码错误" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "用户名或密码错误" };
  }

  const sessionId = await createSession(user.id);

  const cookieStore = await cookies();
  cookieStore.set("session_id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });

  return { success: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (sessionId) {
    await deleteSession(sessionId);
    cookieStore.delete("session_id");
  }
}

export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission);
}
