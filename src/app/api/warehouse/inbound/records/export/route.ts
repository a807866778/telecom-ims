import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 导出入库记录 Excel
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
    const type = url.searchParams.get("type") || "";

    const records: any[] = [];

    // 1. 直接入库记录 (inbound_records)
    let directQuery = `
      SELECT 
        ir.id,
        ir.id as record_no,
        ir.supplier_id,
        ir.operator_id,
        ir.total_amount,
        ir.remark,
        ir.photo_url,
        ir.created_at,
        s.name as supplier_name,
        u.real_name as operator_name
      FROM inbound_records ir
      LEFT JOIN suppliers s ON ir.supplier_id = s.id
      LEFT JOIN users u ON ir.operator_id = u.id
      WHERE 1=1
    `;
    const directParams: any[] = [];

    if (startDate) {
      directQuery += ` AND ir.created_at >= ?`;
      directParams.push(new Date(startDate).getTime());
    }
    if (endDate) {
      directQuery += ` AND ir.created_at <= ?`;
      directParams.push(new Date(endDate).getTime() + 86400000);
    }

    const directResult = await db.prepare(directQuery).bind(...directParams).all();
    
    for (const r of directResult.results || []) {
      records.push({
        id: r.id,
        recordNo: r.record_no,
        type: "直接入库",
        sourceName: r.supplier_name || "-",
        operatorName: r.operator_name || "-",
        createdAt: r.created_at,
        remark: r.remark,
        source: "inbound",
      });
    }

    // 2. 采购收货入库 (purchase_receipts)
    let purchaseQuery = `
      SELECT 
        pr.id,
        pr.receipt_no as record_no,
        pr.operator_id,
        pr.total_amount,
        pr.remark,
        pr.photo_url,
        pr.created_at,
        u.real_name as operator_name
      FROM purchase_receipts pr
      LEFT JOIN users u ON pr.operator_id = u.id
      WHERE 1=1
    `;
    const purchaseParams: any[] = [];

    if (startDate) {
      purchaseQuery += ` AND pr.created_at >= ?`;
      purchaseParams.push(new Date(startDate).getTime());
    }
    if (endDate) {
      purchaseQuery += ` AND pr.created_at <= ?`;
      purchaseParams.push(new Date(endDate).getTime() + 86400000);
    }

    const purchaseResult = await db.prepare(purchaseQuery).bind(...purchaseParams).all();
    
    for (const r of purchaseResult.results || []) {
      records.push({
        id: r.id,
        recordNo: r.record_no,
        type: "采购入库",
        sourceName: "采购收货",
        operatorName: r.operator_name || "-",
        createdAt: r.created_at,
        remark: r.remark,
        source: "purchase",
      });
    }

    // 3. 报溢入库 (stock_adjustments - 报溢)
    let overflowQuery = `
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
      WHERE sa.adjustment_type = '报溢'
    `;
    const overflowParams: any[] = [];

    if (startDate) {
      overflowQuery += ` AND sa.created_at >= ?`;
      overflowParams.push(new Date(startDate).getTime());
    }
    if (endDate) {
      overflowQuery += ` AND sa.created_at <= ?`;
      overflowParams.push(new Date(endDate).getTime() + 86400000);
    }

    const overflowResult = await db.prepare(overflowQuery).bind(...overflowParams).all();
    
    for (const r of overflowResult.results || []) {
      records.push({
        id: r.id,
        recordNo: `BY-${r.id.slice(0, 8)}`,
        type: "报溢入库",
        sourceName: "库存报溢",
        operatorName: r.operator_name || "-",
        createdAt: r.created_at,
        remark: r.reason || "-",
        source: "adjustment",
        materialName: r.material_name,
        materialUnit: r.material_unit,
        quantity: r.quantity,
      });
    }

    // 获取明细数据
    const directIds = records.filter(r => r.source === "inbound").map(r => r.id);
    const purchaseIds = records.filter(r => r.source === "purchase").map(r => r.id);

    // 直接入库明细
    let directItems: any[] = [];
    if (directIds.length > 0) {
      const placeholders = directIds.map(() => "?").join(",");
      const itemsResult = await db.prepare(`
        SELECT ii.inbound_id, ii.material_id, ii.quantity, ii.unit_price, m.name, m.spec, m.unit
        FROM inbound_items ii
        LEFT JOIN materials m ON ii.material_id = m.id
        WHERE ii.inbound_id IN (${placeholders})
      `).bind(...directIds).all();
      directItems = itemsResult.results || [];
    }

    // 采购收货明细
    let purchaseItems: any[] = [];
    if (purchaseIds.length > 0) {
      const placeholders = purchaseIds.map(() => "?").join(",");
      const itemsResult = await db.prepare(`
        SELECT pri.receipt_id, pri.material_id, pri.quantity, pri.unit_price, m.name, m.spec, m.unit
        FROM purchase_receipt_items pri
        LEFT JOIN materials m ON pri.material_id = m.id
        WHERE pri.receipt_id IN (${placeholders})
      `).bind(...purchaseIds).all();
      purchaseItems = itemsResult.results || [];
    }

    // 构建 Excel 数据
    const excelData: any[] = [];

    for (const record of records) {
      if (record.source === "inbound") {
        const items = directItems.filter((i: any) => i.inbound_id === record.id);
        if (items.length > 0) {
          for (const item of items) {
            excelData.push({
              "入库单号": record.recordNo,
              "类型": record.type,
              "供应商": record.sourceName,
              "物料名称": item.name || "(未知)",
              "规格": item.spec || "-",
              "单位": item.unit || "-",
              "数量": item.quantity,
              "单价(元)": item.unit_price || 0,
              "小计(元)": (item.quantity || 0) * (item.unit_price || 0),
              "操作员": record.operatorName,
              "入库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
              "备注": record.remark || "-",
            });
          }
        } else {
          excelData.push({
            "入库单号": record.recordNo,
            "类型": record.type,
            "供应商": record.sourceName,
            "物料名称": "-",
            "规格": "-",
            "单位": "-",
            "数量": 0,
            "单价(元)": 0,
            "小计(元)": 0,
            "操作员": record.operatorName,
            "入库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
            "备注": record.remark || "-",
          });
        }
      } else if (record.source === "purchase") {
        const items = purchaseItems.filter((i: any) => i.receipt_id === record.id);
        if (items.length > 0) {
          for (const item of items) {
            excelData.push({
              "入库单号": record.recordNo,
              "类型": record.type,
              "供应商": "采购收货",
              "物料名称": item.name || "(未知)",
              "规格": item.spec || "-",
              "单位": item.unit || "-",
              "数量": item.quantity,
              "单价(元)": item.unit_price || 0,
              "小计(元)": (item.quantity || 0) * (item.unit_price || 0),
              "操作员": record.operatorName,
              "入库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
              "备注": record.remark || "-",
            });
          }
        } else {
          excelData.push({
            "入库单号": record.recordNo,
            "类型": record.type,
            "供应商": "采购收货",
            "物料名称": "-",
            "规格": "-",
            "单位": "-",
            "数量": 0,
            "单价(元)": 0,
            "小计(元)": 0,
            "操作员": record.operatorName,
            "入库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
            "备注": record.remark || "-",
          });
        }
      } else if (record.source === "adjustment") {
        excelData.push({
          "入库单号": record.recordNo,
          "类型": record.type,
          "供应商": "库存报溢",
          "物料名称": record.materialName || "(未知)",
          "规格": "-",
          "单位": record.materialUnit || "-",
          "数量": record.quantity,
          "单价(元)": 0,
          "小计(元)": 0,
          "操作员": record.operatorName,
          "入库时间": new Date(record.createdAt).toLocaleString("zh-CN"),
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
      { wch: 20 }, // 入库单号
      { wch: 10 }, // 类型
      { wch: 15 }, // 供应商
      { wch: 15 }, // 物料名称
      { wch: 15 }, // 规格
      { wch: 8 },  // 单位
      { wch: 10 }, // 数量
      { wch: 12 }, // 单价
      { wch: 12 }, // 小计
      { wch: 10 }, // 操作员
      { wch: 20 }, // 入库时间
      { wch: 20 }, // 备注
    ];

    XLSX.utils.book_append_sheet(wb, ws, "入库记录");

    // 添加说明工作表
    const instructionData = [
      { "类型": "直接入库", "说明": "直接创建的入库单" },
      { "类型": "采购入库", "说明": "采购收货后自动生成的入库记录" },
      { "类型": "报溢入库", "说明": "库存盘点发现的溢余数量" },
      { "类型": "盘库调整", "说明": "盘点后调整的差异（盘盈）" },
    ];
    const wsInstruction = XLSX.utils.json_to_sheet(instructionData);
    XLSX.utils.book_append_sheet(wb, wsInstruction, "类型说明");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 生成文件名
    const now = new Date();
    const filename = `入库记录_${now.toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("Inbound export error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
