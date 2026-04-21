import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有合同
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db
      .prepare(
        `SELECT pc.*, p.name as project_name
         FROM project_contracts pc
         LEFT JOIN projects p ON pc.project_id = p.id
         ORDER BY pc.created_at DESC`
      )
      .all();

    const data =
      result.results?.map((c: any) => {
        // 解析 contract_urls JSON 数组，取第一个作为 contractUrl
        let contractUrl = null;
        try {
          const urls = c.contract_urls ? JSON.parse(c.contract_urls) : [];
          contractUrl = urls[0] || null;
        } catch {
          contractUrl = null;
        }
        return {
          id: c.id,
          projectId: c.project_id,
          projectName: c.project_name,
          contractNo: c.contract_no,
          amount: c.contract_amount,
          contractUrl,
          signDate: c.signed_date,
          remark: c.remark,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        };
      }) || [];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Contracts GET error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - 创建合同
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { projectId, contractName, contractNo, amount, contractUrl, signedDate, remark } = body;

    const id = crypto.randomUUID();
    const now = Date.now();

    // 自动生成合同编号：如果未提供，使用 HT+yyyymmdd+当日序号
    let finalContractNo = contractNo;
    if (!finalContractNo) {
      const now2 = new Date();
      const yyyymmdd = `${now2.getFullYear()}${String(now2.getMonth() + 1).padStart(2, "0")}${String(now2.getDate()).padStart(2, "0")}`;
      const todayPrefix = `HT${yyyymmdd}`;
      // 查询今日已有合同数量
      const countResult = await db.prepare(
        "SELECT COUNT(*) as cnt FROM project_contracts WHERE contract_no LIKE ? || '%'"
      ).bind(todayPrefix).first();
      const seq = (countResult?.cnt || 0) + 1;
      finalContractNo = `${todayPrefix}${String(seq).padStart(2, "0")}`;
    }

    // 将单个 contractUrl 转换为数组存储
    const contractUrls = contractUrl ? [contractUrl] : [];

    // 禁用外键约束
    await db.prepare("PRAGMA foreign_keys = OFF").run();
    try {
      await db
        .prepare(
          `INSERT INTO project_contracts (id, project_id, contract_no, contract_name, contract_amount, contract_urls, signed_date, remark, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, projectId || null, finalContractNo, contractName || finalContractNo, amount || 0, contractUrls.length > 0 ? JSON.stringify(contractUrls) : null, signedDate || null, remark || null, now, now)
        .run();
    } finally {
      await db.prepare("PRAGMA foreign_keys = ON").run();
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Contracts POST error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// PUT - 更新合同
export async function PUT(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const body = await request.json();
    const { id, projectId, contractNo, amount, contractUrl, signedDate, remark } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID不能为空" }, { status: 400 });
    }

    const now = Date.now();
    const contractUrls = contractUrl ? [contractUrl] : [];

    await db
      .prepare(
        `UPDATE project_contracts SET project_id = ?, contract_no = ?, contract_amount = ?, contract_urls = ?, signed_date = ?, remark = ?, updated_at = ? WHERE id = ?`
      )
      .bind(projectId || null, contractNo || null, amount || 0, contractUrls.length > 0 ? JSON.stringify(contractUrls) : null, signedDate || null, remark || null, now, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contracts PUT error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// DELETE - 删除合同
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

    await db.prepare("DELETE FROM project_contracts WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contracts DELETE error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
