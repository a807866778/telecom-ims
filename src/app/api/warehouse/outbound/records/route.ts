import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 类型定义
type OutboundType = "直接出库" | "退货出库" | "报损出库" | "盘库调整";

interface OutboundRecordItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string | null;
  materialUnit: string;
  quantity: number;
  unitPrice: number;
}

interface OutboundRecord {
  id: string;
  recordNo: string;
  type: OutboundType;
  supplierId: string | null;
  supplierName: string | null;
  projectId: string | null;
  projectName: string | null;
  operatorId: string | null;
  operatorName: string | null;
  totalAmount: number;
  remark: string | null;
  photoUrl: string | null;
  createdAt: number;
  items: OutboundRecordItem[];
  itemCount: number;
}

// GET - 获取综合出库记录列表
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const materialId = url.searchParams.get("materialId") || "";
    const projectId = url.searchParams.get("projectId") || "";
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";
    const type = url.searchParams.get("type") || ""; // 可按类型筛选

    const records: OutboundRecord[] = [];

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

    if (materialId) {
      directQuery += ` AND EXISTS (SELECT 1 FROM outbound_items oi WHERE oi.outbound_id = out_rec.id AND oi.material_id = ?)`;
      directParams.push(materialId);
    }
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
        supplierId: null,
        supplierName: null,
        projectId: r.project_id,
        projectName: r.project_name,
        operatorId: r.operator_id,
        operatorName: r.operator_name,
        totalAmount: r.total_amount || 0,
        remark: r.remark,
        photoUrl: r.photo_url,
        createdAt: r.created_at,
        items: [],
        itemCount: 0,
      });
    }

    // 2. 退货出库 (return_records) - 退给供应商
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

    if (materialId) {
      returnQuery += ` AND EXISTS (SELECT 1 FROM return_items ri WHERE ri.return_id = rr.id AND ri.material_id = ?)`;
      returnParams.push(materialId);
    }
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
        supplierId: null,
        supplierName: null,
        projectId: null,
        projectName: null,
        operatorId: r.operator_id,
        operatorName: r.operator_name,
        totalAmount: r.total_amount || 0,
        remark: r.remark,
        photoUrl: null,
        createdAt: r.created_at,
        items: [],
        itemCount: 0,
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
        m.spec as material_spec,
        m.unit as material_unit
      FROM stock_adjustments sa
      LEFT JOIN users u ON sa.operator_id = u.id
      LEFT JOIN materials m ON sa.material_id = m.id
      WHERE sa.adjustment_type = '报损'
    `;
    const lossParams: any[] = [];

    if (materialId) {
      lossQuery += ` AND sa.material_id = ?`;
      lossParams.push(materialId);
    }
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
      // 报损记录作为单条出库记录
      records.push({
        id: r.id,
        recordNo: `BS-${r.id.slice(0, 8)}`,
        type: "报损出库",
        supplierId: null,
        supplierName: null,
        projectId: null,
        projectName: null,
        operatorId: r.operator_id,
        operatorName: r.operator_name,
        totalAmount: 0,
        remark: r.reason,
        photoUrl: null,
        createdAt: r.created_at,
        items: [{
          id: r.id,
          materialId: r.material_id,
          materialName: r.material_name || "未知物料",
          materialSpec: r.material_spec,
          materialUnit: r.material_unit || "",
          quantity: Math.abs(r.quantity),
          unitPrice: 0,
        }],
        itemCount: 1,
      });
    }

    // 4. 盘库调整出库 (stock_check_items - 盘亏)
    let checkQuery = `
      SELECT 
        sci.id,
        sci.check_id,
        sci.material_id,
        sci.system_quantity,
        sci.actual_quantity,
        sc.check_date,
        sc.operator_id,
        sc.created_at,
        u.real_name as operator_name,
        m.name as material_name,
        m.spec as material_spec,
        m.unit as material_unit
      FROM stock_check_items sci
      LEFT JOIN stock_checks sc ON sci.check_id = sc.id
      LEFT JOIN users u ON sc.operator_id = u.id
      LEFT JOIN materials m ON sci.material_id = m.id
      WHERE sc.status = '已完成' AND sci.actual_quantity < sci.system_quantity
    `;
    const checkParams: any[] = [];

    if (materialId) {
      checkQuery += ` AND sci.material_id = ?`;
      checkParams.push(materialId);
    }
    if (startDate) {
      checkQuery += ` AND sc.created_at >= ?`;
      checkParams.push(new Date(startDate).getTime());
    }
    if (endDate) {
      checkQuery += ` AND sc.created_at <= ?`;
      checkParams.push(new Date(endDate).getTime() + 86400000);
    }

    const checkResult = await db.prepare(checkQuery).bind(...checkParams).all();
    
    for (const r of checkResult.results || []) {
      const diff = r.system_quantity - r.actual_quantity;
      records.push({
        id: r.id,
        recordNo: `PK-${r.check_id.slice(0, 8)}`,
        type: "盘库调整",
        supplierId: null,
        supplierName: null,
        projectId: null,
        projectName: null,
        operatorId: r.operator_id,
        operatorName: r.operator_name,
        totalAmount: 0,
        remark: `盘库差异：系统${r.system_quantity}，实际${r.actual_quantity}`,
        photoUrl: null,
        createdAt: r.created_at,
        items: [{
          id: r.id,
          materialId: r.material_id,
          materialName: r.material_name || "未知物料",
          materialSpec: r.material_spec,
          materialUnit: r.material_unit || "",
          quantity: diff,
          unitPrice: 0,
        }],
        itemCount: 1,
      });
    }

    // 如果有出库记录，获取明细
    const recordIds = records.map(r => r.id);
    
    if (recordIds.length > 0) {
      const placeholders = recordIds.map(() => "?").join(",");
      
      // 直接出库明细
      const directItemsResult = await db.prepare(`
        SELECT oi.*, m.name as material_name, m.spec as material_spec, m.unit as material_unit
        FROM outbound_items oi
        LEFT JOIN materials m ON oi.material_id = m.id
        WHERE oi.outbound_id IN (${placeholders})
      `).bind(...recordIds).all();

      // 退货出库明细
      const returnItemsResult = await db.prepare(`
        SELECT ri.*, m.name as material_name, m.spec as material_spec, m.unit as material_unit
        FROM return_items ri
        LEFT JOIN materials m ON ri.material_id = m.id
        WHERE ri.return_id IN (${placeholders})
      `).bind(...recordIds).all();

      // 更新记录的明细
      for (const record of records) {
        if (record.type === "直接出库") {
          const items = (directItemsResult.results || []).filter((i: any) => i.outbound_id === record.id);
          record.items = items.map((i: any) => ({
            id: i.id,
            materialId: i.material_id,
            materialName: i.material_name || "",
            materialSpec: i.material_spec,
            materialUnit: i.material_unit || "",
            quantity: i.quantity,
            unitPrice: i.unit_price || 0,
          }));
        } else if (record.type === "退货出库") {
          const items = (returnItemsResult.results || []).filter((i: any) => i.return_id === record.id);
          record.items = items.map((i: any) => ({
            id: i.id,
            materialId: i.material_id,
            materialName: i.material_name || "",
            materialSpec: i.material_spec,
            materialUnit: i.material_unit || "",
            quantity: i.quantity,
            unitPrice: i.unit_price || 0,
          }));
        }
        record.itemCount = record.items.length;
      }
    }

    // 按类型筛选
    let filteredRecords = records;
    if (type) {
      filteredRecords = records.filter(r => r.type === type);
    }

    // 按时间倒序
    filteredRecords.sort((a, b) => b.createdAt - a.createdAt);

    // 限制数量
    filteredRecords = filteredRecords.slice(0, 200);

    return NextResponse.json({ success: true, data: filteredRecords });
  } catch (error) {
    console.error("Outbound records API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
