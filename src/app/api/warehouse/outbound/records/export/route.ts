import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 导出出库记录 Excel
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";
    const projectId = url.searchParams.get("projectId") || "";
    const type = url.searchParams.get("type") || "";

    const records: any[] = [];

    // 1. 直接出库记录 (outbound_records)
    let directQuery = `
      SELECT 
        out_rec.id,
        out_rec.id as record_no,
        out_rec.project_id,
        out_rec.operator_id,
        out_rec.total_amount,
        out_rec.remark,
        out_rec.photo_url,
        out_rec.created_at,
        p.name as project_name,
        u.real_name as operator_name
      FROM outbound_records out_rec
      LEFT JOIN projects p ON out_rec.project_id = p.id
      LEFT JOIN users u ON out_rec.operator_id = u.id
      WHERE 1=1
    `;
    const directParams: any[] = [];

    if (projectId) {
      directQuery += ` AND out_rec.project_id = ?`;
      directParams.push(projectId);
    }
    if (startDate) {
      directQuery += ` AND out_rec.created_at >= ?`;
      directParams.push(new Date(startDate).getTime());
    }
    if (endDate) {
      directQuery += ` AND out_rec.created_at <= ?`;
      directParams.push(new Date(endDate).getTime() + 86400000);
    }

    const directResult = await db.prepare(directQuery).bind(...directParams).all();
    
    for (const r of directResult.results || []) {
      records.push({
        id: r.id,
        recordNo: r.record_no,
        type: "直接出库",
        projectName: r.project_name || "-",
        operatorName: r.operator_name || "-",
        createdAt: r.created_at,
        remark: r.remark,
        source: "outbound",
      });
    }

    // 2. 退货出库 (return_records)
    let returnQuery = `
      SELECT 
        rr.id,
        rr.id as record_no,
        rr.operator_id,
        rr.total_amount,
        rr.remark,
        rr.created_at,
        u.real_name as operator_name
      FROM return_records rr
      LEFT JOIN users u ON rr.operator_id = u.id
      WHERE 1=1
    `;
    const returnParams: any[] = [];

    if (startDate) {
      returnQuery += ` AND rr.created_at >= ?`;
      returnParams.push(new Date(startDate).getTime());
    }
    if (endDate) {
      returnQuery += ` AND rr.created_at <= ?`;
      returnParams.push(new Date(endDate).getTime() + 86400000);
    }

    const returnResult = await db.prepare(returnQuery).bind(...returnParams).all();
    
    for (const r of returnResult.results || []) {
      records.push({
        id: r.id,
        recordNo: r.record_no,
        type: "退货出库",
        projectName: "退货",
        operatorName: r.operator_name || "-",
        createdAt: r.created_at,
        remark: r.remark,
        source: "return",
      });
    }

    // 3. 报损出库 (stock_adjustments - 报损)
    let lossQuery = `
      SELECT 
        sa.id,
        sa.id as record_no,
        sa.material_id,
        sa.adjustment_type,
        sa.quantity,
        sa.reason,
        sa.operator_id,
        sa.created_at,
        u.real_name as operator_name,
        m.name as material_name,
        m.unit as material_unit
      FROM stock_adjustments sa
      LEFT JOIN users u ON sa.operator_id = u.id
      LEFT JOIN materials m ON sa.material_id = m.id
      WHERE sa.adjustment_type = '报损'
    `;
    const lossParams: any[] = [];

    if (startDate) {
      lossQuery += ` AND sa.created_at >= ?`;
      lossParams.push(new Date(startDate).getTime());
    }
    if (endDate) {
      lossQuery += ` AND sa.created_at <= ?`;
      lossParams.push(new Date(endDate).getTime() + 86400000);
    }

    const lossResult = await db.prepare(lossQuery).bind(...lossParams).all();
    
    for (const r of lossResult.results || []) {
      records.push({
        id: r.id,
        recordNo: `BS-${r.id.slice(0, 8)}`,
        type: "报损出库",
        projectName: "库存报损",
        operatorName: r.operator_name || "-",
        createdAt: r.created_at,
        remark: r.reason || "-",
        source: "adjustment",
        materialName: r.material_name,
        materialUnit: r.material_unit,
        quantity: Math.abs(r.quantity),
      });
    }

    // 获取明细数据
    const outboundIds = records.filter(r => r.source === "outbound").map(r => r.id);
    const returnIds = records.filter(r => r.source === "return").map(r => r.id);

    // 直接出库明细
    let outboundItems: any[] = [];
    if (outboundIds.length > 0) {
      const placeholders = outboundIds.map(() => "?").join(",");
      const itemsResult = await db.prepare(`
        SELECT oi.outbound_id, oi.material_id, oi.quantity, oi.unit_price, m.name, m.spec, m.unit
        FROM outbound_items oi
        LEFT JOIN materials m ON oi.material_id = m.id
        WHERE oi.outbound_id IN (${placeholders})
      `).bind(...outboundIds).all();
      outboundItems = itemsResult.results || [];
    }

    // 退货出库明细
    let returnItems: any[] = [];
    if (returnIds.length > 0) {
      const placeholders = returnIds.map(() => "?").join(",");
      const itemsResult = await db.prepare(`
        SELECT ri.return_id, ri.material_id, ri.quantity, ri.unit_price, m.name, m.spec, m.unit
        FROM return_items ri
        LEFT JOIN materials m ON ri.material_id = m.id
        WHERE ri.return_id IN (${placeholders})
      `).bind(...returnIds).all();
      returnItems = itemsResult.results || [];
    }

    // 构建 Excel 数据
    const excelData: any[] = [];

    for (const record of records) {
      if (record.source === "outbound") {
        const items = outboundItems.filter((i: any) => i.outbound_id === record.id);
        if (items.length > 0) {
          for (const item of items) {
            excelData.push({
              "出库单号": record.recordNo,
              "类型": record.type,
              "项目": record.projectName,
              "物料名称": item.name || "(未知)",
              "规格": item.spec || "-",
              "单位": item.unit || "-",
              "数量": item.quantity,
              "单价(元)": item.unit_price || 0,
              "小计(元)": (item.quantity || 0) * (item.unit_price || 0),
              "操作员": record.operatorName,
              "出库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
              "备注": record.remark || "-",
            });
          }
        } else {
          excelData.push({
            "出库单号": record.recordNo,
            "类型": record.type,
            "项目": record.projectName,
            "物料名称": "-",
            "规格": "-",
            "单位": "-",
            "数量": 0,
            "单价(元)": 0,
            "小计(元)": 0,
            "操作员": record.operatorName,
            "出库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
            "备注": record.remark || "-",
          });
        }
      } else if (record.source === "return") {
        const items = returnItems.filter((i: any) => i.return_id === record.id);
        if (items.length > 0) {
          for (const item of items) {
            excelData.push({
              "出库单号": record.recordNo,
              "类型": record.type,
              "项目": "退货",
              "物料名称": item.name || "(未知)",
              "规格": item.spec || "-",
              "单位": item.unit || "-",
              "数量": item.quantity,
              "单价(元)": item.unit_price || 0,
              "小计(元)": (item.quantity || 0) * (item.unit_price || 0),
              "操作员": record.operatorName,
              "出库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
              "备注": record.remark || "-",
            });
          }
        } else {
          excelData.push({
            "出库单号": record.recordNo,
            "类型": record.type,
            "项目": "退货",
            "物料名称": "-",
            "规格": "-",
            "单位": "-",
            "数量": 0,
            "单价(元)": 0,
            "小计(元)": 0,
            "操作员": record.operatorName,
            "出库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
            "备注": record.remark || "-",
          });
        }
      } else if (record.source === "adjustment") {
        excelData.push({
          "出库单号": record.recordNo,
          "类型": record.type,
          "项目": "库存报损",
          "物料名称": record.materialName || "(未知)",
          "规格": "-",
          "单位": record.materialUnit || "-",
          "数量": record.quantity,
          "单价(元)": 0,
          "小计(元)": 0,
          "操作员": record.operatorName,
          "出库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
          "备注": record.remark,
        });
      }
    }

    // 按类型筛选
    let filteredData = excelData;
    if (type) {
      filteredData = excelData.filter(row => row["类型"] === type);
    }

    // 生成 Excel
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredData);

    // 设置列宽
    ws["!cols"] = [
      { wch: 20 }, // 出库单号
      { wch: 10 }, // 类型
      { wch: 15 }, // 项目
      { wch: 15 }, // 物料名称
      { wch: 15 }, // 规格
      { wch: 8 },  // 单位
      { wch: 10 }, // 数量
      { wch: 12 }, // 单价
      { wch: 12 }, // 小计
      { wch: 10 }, // 操作员
      { wch: 20 }, // 出库时间
      { wch: 20 }, // 备注
    ];

    XLSX.utils.book_append_sheet(wb, ws, "出库记录");

    // 添加说明工作表
    const instructionData = [
      { "类型": "直接出库", "说明": "项目出库单出库的物料" },
      { "类型": "退货出库", "说明": "退货给供应商的物料" },
      { "类型": "报损出库", "说明": "库存盘点发现的损耗数量" },
      { "类型": "盘库调整", "说明": "盘点后调整的差异（盘亏）" },
    ];
    const wsInstruction = XLSX.utils.json_to_sheet(instructionData);
    XLSX.utils.book_append_sheet(wb, wsInstruction, "类型说明");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 生成文件名
    const now = new Date();
    const filename = `出库记录_${now.toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("Outbound export error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
