import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 类型定义
type InboundType = "直接入库" | "采购入库" | "报溢入库" | "盘库调整";

interface InboundRecordItem {
  id: string;
  materialId: string;
  materialName: string;
  materialSpec: string | null;
  materialUnit: string;
  quantity: number;
  unitPrice: number;
}

interface InboundRecord {
  id: string;
  recordNo: string;
  type: InboundType;
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
  items: InboundRecordItem[];
  itemCount: number;
}

// GET - 获取综合入库记录列表
export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const url = new URL(request.url);
    const materialId = url.searchParams.get("materialId") || "";
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";
    const type = url.searchParams.get("type") || ""; // 可按类型筛选

    const records: InboundRecord[] = [];

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

    if (materialId) {
      directQuery += ` AND EXISTS (SELECT 1 FROM inbound_items ii WHERE ii.inbound_id = ir.id AND ii.material_id = ?)`;
      directParams.push(materialId);
    }
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
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        projectId: null,
        projectName: null,
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

    if (materialId) {
      purchaseQuery += ` AND EXISTS (SELECT 1 FROM purchase_receipt_items pri WHERE pri.receipt_id = pr.id AND pri.material_id = ?)`;
      purchaseParams.push(materialId);
    }
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
        supplierId: null,
        supplierName: null,
        projectId: null,
        projectName: null,
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
        m.spec as material_spec,
        m.unit as material_unit
      FROM stock_adjustments sa
      LEFT JOIN users u ON sa.operator_id = u.id
      LEFT JOIN materials m ON sa.material_id = m.id
      WHERE sa.adjustment_type = '报溢'
    `;
    const overflowParams: any[] = [];

    if (materialId) {
      overflowQuery += ` AND sa.material_id = ?`;
      overflowParams.push(materialId);
    }
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
      // 报溢记录作为单条入库记录
      records.push({
        id: r.id,
        recordNo: `BY-${r.id.slice(0, 8)}`,
        type: "报溢入库",
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
          quantity: r.quantity,
          unitPrice: 0,
        }],
        itemCount: 1,
      });
    }

    // 4. 盘库调整入库 (stock_check_items - 盘盈)
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
      WHERE sc.status = '已完成' AND sci.actual_quantity > sci.system_quantity
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
      const diff = r.actual_quantity - r.system_quantity;
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

    // 如果有入库记录，获取明细
    const recordIds = records.map(r => r.id);
    
    if (recordIds.length > 0) {
      const placeholders = recordIds.map(() => "?").join(",");
      
      // 直接入库明细
      const directItemsResult = await db.prepare(`
        SELECT ii.*, m.name as material_name, m.spec as material_spec, m.unit as material_unit
        FROM inbound_items ii
        LEFT JOIN materials m ON ii.material_id = m.id
        WHERE ii.inbound_id IN (${placeholders})
      `).bind(...recordIds).all();

      // 采购收货明细
      const purchaseItemsResult = await db.prepare(`
        SELECT pri.*, m.name as material_name, m.spec as material_spec, m.unit as material_unit
        FROM purchase_receipt_items pri
        LEFT JOIN materials m ON pri.material_id = m.id
        WHERE pri.receipt_id IN (${placeholders})
      `).bind(...recordIds).all();

      // 更新记录的明细
      for (const record of records) {
        if (record.type === "直接入库") {
          const items = (directItemsResult.results || []).filter((i: any) => i.inbound_id === record.id);
          record.items = items.map((i: any) => ({
            id: i.id,
            materialId: i.material_id,
            materialName: i.material_name || "",
            materialSpec: i.material_spec,
            materialUnit: i.material_unit || "",
            quantity: i.quantity,
            unitPrice: i.unit_price || 0,
          }));
        } else if (record.type === "采购入库") {
          const items = (purchaseItemsResult.results || []).filter((i: any) => i.receipt_id === record.id);
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
    console.error("Inbound records API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
