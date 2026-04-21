import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取证照档案
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");

    let query = `SELECT sl.*, s.name as staff_name FROM staff_licenses sl LEFT JOIN staff s ON sl.staff_id = s.id`;
    const bindings: any[] = [];

    if (staffId) {
      query += " WHERE sl.staff_id = ?";
      bindings.push(staffId);
    }

    query += " ORDER BY sl.created_at DESC";

    const result = await db.prepare(query).bind(...bindings).all();

    const data =
      result.results?.map((r: any) => ({
        id: r.id,
        staffId: r.staff_id,
        staffName: r.staff_name,
        licenseType: r.license_type,
        licenseNo: r.license_no,
        licenseUrl: r.license_url,
        issueDate: r.issue_date,
        expiryDate: r.expire_date,
        status: r.status,
        remark: r.remark,
        createdAt: r.created_at,
      })) || [];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Staff licenses GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建证照档案
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { staffId, licenseType, licenseNo, licenseUrl, issueDate, expiryDate, status, remark } = body;

    if (!staffId || !licenseType) {
      return NextResponse.json({ success: false, error: "人员ID和证照类型不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO staff_licenses (id, staff_id, license_type, license_no, license_url, issue_date, expire_date, status, remark, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, staffId, licenseType, licenseNo || null, licenseUrl || null, issueDate || null, expiryDate || null, status || "有效", remark || null, now)
      .run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Staff licenses POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新证照档案
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, licenseType, licenseNo, licenseUrl, issueDate, expiryDate, status, remark } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    await db
      .prepare(
        `UPDATE staff_licenses SET license_type = ?, license_no = ?, license_url = ?, issue_date = ?, expire_date = ?, status = ?, remark = ? WHERE id = ?`
      )
      .bind(licenseType, licenseNo || null, licenseUrl || null, issueDate || null, expiryDate || null, status || "有效", remark || null, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff licenses PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除证照档案
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

    await db.prepare("DELETE FROM staff_licenses WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff licenses DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
