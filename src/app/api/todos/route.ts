import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json(
        { success: false, error: "数据库不可用" },
        { status: 500 }
      );
    }

    // 检查todos表是否存在，不存在则创建（使用 db.prepare().run() 替代 db.exec()）
    try {
      await db.prepare("SELECT COUNT(*) FROM todos").all();
    } catch {
      // 表不存在，创建它
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'normal',
          due_date INTEGER,
          completed INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `).run();
    }

    const result = await db
      .prepare("SELECT * FROM todos ORDER BY completed ASC, created_at DESC")
      .all();

    const todos = (result.results || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      dueDate: t.due_date ? new Date(t.due_date).toISOString().slice(0, 10) : null,
      completed: Boolean(t.completed),
      createdAt: t.created_at,
    }));

    return NextResponse.json({ success: true, data: todos });
  } catch (error) {
    console.error("Todos GET error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json(
        { success: false, error: "数据库不可用" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { title, type = "normal", dueDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "标题不能为空" },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const now = Date.now();
    const dueTimestamp = dueDate ? new Date(dueDate).getTime() : null;

    // 创建表（如果不存在）
    try {
      await db.prepare("SELECT COUNT(*) FROM todos").all();
    } catch {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'normal',
          due_date INTEGER,
          completed INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `).run();
    }

    await db
      .prepare(
        "INSERT INTO todos (id, title, type, due_date, completed, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)"
      )
      .bind(id, title.trim(), type, dueTimestamp, now, now)
      .run();

    return NextResponse.json({
      success: true,
      data: {
        id,
        title: title.trim(),
        type,
        dueDate,
        completed: false,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error("Todos POST error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json(
        { success: false, error: "数据库不可用" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, title, type, dueDate, completed } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "缺少待办事项ID" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const dueTimestamp = dueDate !== undefined ? (dueDate ? new Date(dueDate).getTime() : null) : undefined;

    // 构建更新语句
    const updates: string[] = ["updated_at = ?"];
    const values: any[] = [now];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title.trim());
    }
    if (type !== undefined) {
      updates.push("type = ?");
      values.push(type);
    }
    if (dueDate !== undefined) {
      updates.push("due_date = ?");
      values.push(dueTimestamp);
    }
    if (completed !== undefined) {
      updates.push("completed = ?");
      values.push(completed ? 1 : 0);
    }

    values.push(id);

    const result = await db
      .prepare(`UPDATE todos SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();

    if (result.meta?.changes === 0) {
      return NextResponse.json(
        { success: false, error: "待办事项不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Todos PUT error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json(
        { success: false, error: "数据库不可用" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "缺少待办事项ID" },
        { status: 400 }
      );
    }

    const result = await db
      .prepare("DELETE FROM todos WHERE id = ?")
      .bind(id)
      .run();

    if (result.meta?.changes === 0) {
      return NextResponse.json(
        { success: false, error: "待办事项不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Todos DELETE error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
