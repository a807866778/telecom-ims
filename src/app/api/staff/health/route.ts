import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取健康档案
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");

    let query = `SELECT sh.*, s.name as staff_name FROM staff_health sh LEFT JOIN staff s ON sh.staff_id = s.id`;
    const bindings: any[] = [];

    if (staffId) {
      query += " WHERE sh.staff_id = ?";
      bindings.push(staffId);
    }

    query += " ORDER BY sh.created_at DESC";

    const result = await db.prepare(query).bind(...bindings).all();

    const data =
      result.results?.map((r: any) => ({
        id: r.id,
        staffId: r.staff_id,
        staffName: r.staff_name,
        healthCertificateNo: r.health_certificate_no,
        healthCertificateUrl: r.health_certificate_url,
        checkupDate: r.checkup_date,
        checkupResult: r.checkup_result,
        checkupReportUrl: r.checkup_report_url,
        expireDate: r.expire_date,
        remark: r.remark,
        createdAt: r.created_at,
      })) || [];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Staff health GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建健康档案
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { staffId, healthCertificateNo, healthCertificateUrl, checkupDate, checkupResult, checkupReportUrl, expireDate, remark } = body;

    if (!staffId) {
      return NextResponse.json({ success: false, error: "人员ID不能为空" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await db
      .prepare(
        `INSERT INTO staff_health (id, staff_id, health_certificate_no, health_certificate_url, checkup_date, checkup_result, checkup_report_url, expire_date, remark, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, staffId, healthCertificateNo || null, healthCertificateUrl || null, checkupDate || null, checkupResult || null, checkupReportUrl || null, expireDate || null, remark || null, now)
      .run();

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Staff health POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新健康档案
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, healthCertificateNo, healthCertificateUrl, checkupDate, checkupResult, checkupReportUrl, expireDate, remark } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    await db
      .prepare(
        `UPDATE staff_health SET health_certificate_no = ?, health_certificate_url = ?, checkup_date = ?, checkup_result = ?, checkup_report_url = ?, expire_date = ?, remark = ? WHERE id = ?`
      )
      .bind(healthCertificateNo || null, healthCertificateUrl || null, checkupDate || null, checkupResult || null, checkupReportUrl || null, expireDate || null, remark || null, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff health PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除健康档案
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

    await db.prepare("DELETE FROM staff_health WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff health DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
