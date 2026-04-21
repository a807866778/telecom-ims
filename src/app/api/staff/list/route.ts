import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有人员
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db.prepare("SELECT * FROM staff ORDER BY created_at DESC").all();

    const data =
      result.results?.map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        idCard: s.id_card,
        position: s.position,
        emergencyContact: s.emergency_contact,
        emergencyPhone: s.emergency_phone,
        status: s.status,
        joinDate: s.join_date,
        leaveDate: s.leave_date,
        remark: s.remark,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })) || [];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Staff GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建人员
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { name, phone, idCard, position, emergencyContact, emergencyPhone, status, joinDate, remark } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "姓名不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO staff (id, name, phone, id_card, position, emergency_contact, emergency_phone, status, join_date, leave_date, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, name, phone || null, idCard || null, position || null, emergencyContact || null, emergencyPhone || null, status || "在职", joinDate || null, null, remark || null, now, now)
      .run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Staff POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新人员
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, name, phone, idCard, position, emergencyContact, emergencyPhone, status, joinDate, leaveDate, remark } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    const now = Date.now();

    await db
      .prepare(
        `UPDATE staff SET name = ?, phone = ?, id_card = ?, position = ?, emergency_contact = ?, emergency_phone = ?, status = ?, join_date = ?, leave_date = ?, remark = ?, updated_at = ? WHERE id = ?`
      )
      .bind(name, phone || null, idCard || null, position || null, emergencyContact || null, emergencyPhone || null, status || "在职", joinDate || null, leaveDate || null, remark || null, now, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除人员
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
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    await db.prepare("DELETE FROM staff_licenses WHERE staff_id = ?").bind(id).run();
    await db.prepare("DELETE FROM staff_health WHERE staff_id = ?").bind(id).run();
    await db.prepare("DELETE FROM staff WHERE id = ?").bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
