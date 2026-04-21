import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);

    if (!db) {
      return NextResponse.json(
        { success: false, error: "数据库不可用" },
        { status: 500 }
      );
    }

    const mode = searchParams.get("mode") || "list"; // list | summary
    const group = searchParams.get("group") || "customer"; // customer | supplier
    const period = searchParams.get("period") || "year"; // year | month
    const type = searchParams.get("type"); // income | expense (optional filter)

    // 确保表存在
    await ensureTableExists(db);

    if (mode === "summary") {
      // ========== 汇总模式 ==========
      // 获取时间范围
      const now = new Date();
      let startDate: Date;

      if (period === "year") {
        // 本年度
        startDate = new Date(now.getFullYear(), 0, 1);
      } else {
        // 本月度
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const startTimestamp = startDate.getTime();

      if (group === "supplier") {
        // 供应商支出汇总
        const counterpartyType = "supplier";
        const result = await db
          .prepare(`
            SELECT counterparty_id, counterparty_name, SUM(amount) as total_amount, COUNT(*) as record_count
            FROM payment_records
            WHERE type = 'expense' AND counterparty_type = ? AND payment_date >= ?
            GROUP BY counterparty_id
            ORDER BY total_amount DESC
          `)
          .bind(counterpartyType, startTimestamp)
          .all();

        // 计算总计
        const total = (result.results || []).reduce(
          (sum: number, r: any) => sum + (r.total_amount || 0),
          0
        );

        return NextResponse.json({
          success: true,
          data: {
            period,
            group,
            total,
            records: (result.results || []).map((r: any) => ({
              counterpartyId: r.counterparty_id,
              counterpartyName: r.counterparty_name,
              totalAmount: Math.round(r.total_amount * 100) / 100,
              recordCount: r.record_count,
            })),
          },
        });
      } else {
        // 客户收入汇总
        const counterpartyType = "distributor";
        const result = await db
          .prepare(`
            SELECT counterparty_id, counterparty_name, SUM(amount) as total_amount, COUNT(*) as record_count
            FROM payment_records
            WHERE type = 'income' AND counterparty_type = ? AND payment_date >= ?
            GROUP BY counterparty_id
            ORDER BY total_amount DESC
          `)
          .bind(counterpartyType, startTimestamp)
          .all();

        // 计算总计
        const total = (result.results || []).reduce(
          (sum: number, r: any) => sum + (r.total_amount || 0),
          0
        );

        return NextResponse.json({
          success: true,
          data: {
            period,
            group,
            total,
            records: (result.results || []).map((r: any) => ({
              counterpartyId: r.counterparty_id,
              counterpartyName: r.counterparty_name,
              totalAmount: Math.round(r.total_amount * 100) / 100,
              recordCount: r.record_count,
            })),
          },
        });
      }
    }

    // ========== 列表模式 ==========
    let query = "SELECT * FROM payment_records";
    const conditions: string[] = [];

    if (type) {
      conditions.push("type = ?");
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY payment_date DESC, created_at DESC";

    const stmt = db.prepare(query);
    const result = type
      ? await stmt.bind(type).all()
      : await stmt.all();

    const records = (result.results || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      counterpartyType: r.counterparty_type,
      counterpartyId: r.counterparty_id,
      counterpartyName: r.counterparty_name,
      amount: r.amount,
      paymentDate: r.payment_date
        ? new Date(r.payment_date).toISOString().slice(0, 10)
        : null,
      relatedProjectId: r.related_project_id,
      relatedProjectName: r.related_project_name,
      remark: r.remark,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Payment records GET error:", error);
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
    const {
      type,
      counterpartyType,
      counterpartyId,
      counterpartyName,
      amount,
      paymentDate,
      relatedProjectId,
      relatedProjectName,
      remark,
    } = body;

    if (!type || !counterpartyType || !counterpartyId || !counterpartyName || !amount || !paymentDate) {
      return NextResponse.json(
        { success: false, error: "缺少必要字段" },
        { status: 400 }
      );
    }

    await ensureTableExists(db);

    const id = uuidv4();
    const now = Date.now();
    const paymentTimestamp = new Date(paymentDate).getTime();

    // 禁用外键约束（counterparty_id 可能引用 suppliers 或 distributors）
    await db.prepare("PRAGMA foreign_keys = OFF").run();
    try {
      // 直接插入，不引用 project 表（避免外键约束失败）
      await db
        .prepare(
          "INSERT INTO payment_records (id, type, counterparty_type, counterparty_id, counterparty_name, amount, payment_date, related_project_id, related_project_name, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          id,
          type,
          counterpartyType,
          counterpartyId,
          counterpartyName,
          Number(amount),
          paymentTimestamp,
          relatedProjectId || null,
          relatedProjectName || null,
          remark || null,
          now,
          now
        )
        .run();
    } finally {
      await db.prepare("PRAGMA foreign_keys = ON").run();
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        type,
        counterpartyType,
        counterpartyId,
        counterpartyName,
        amount: Number(amount),
        paymentDate,
        relatedProjectId,
        relatedProjectName,
        remark,
      },
    });
  } catch (error) {
    console.error("Payment records POST error:", error);
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
        { success: false, error: "缺少记录ID" },
        { status: 400 }
      );
    }

    const result = await db
      .prepare("DELETE FROM payment_records WHERE id = ?")
      .bind(id)
      .run();

    if (result.meta?.changes === 0) {
      return NextResponse.json(
        { success: false, error: "记录不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment records DELETE error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

async function ensureTableExists(db: any) {
  // 仅在表不存在时创建，绝对不能 DROP 已有表
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      counterparty_type TEXT NOT NULL,
      counterparty_id TEXT NOT NULL,
      counterparty_name TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date INTEGER NOT NULL,
      related_project_id TEXT,
      related_project_name TEXT,
      remark TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();
}


