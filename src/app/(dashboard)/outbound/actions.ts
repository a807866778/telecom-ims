"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

interface OutboundItemData {
  materialId: string;
  quantity: number;
  unitPrice: number;
}

export async function createOutboundRecord(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("outbound:create")) {
    return { error: "没有权限" };
  }

  try {
    const projectId = formData.get("projectId") as string;
    const remark = formData.get("remark") as string;
    const itemsStr = formData.get("items") as string;

    if (!projectId) {
      return { error: "请选择项目" };
    }

    if (!itemsStr) {
      return { error: "请添加出库物料" };
    }

    const items: OutboundItemData[] = JSON.parse(itemsStr);
    if (items.length === 0) {
      return { error: "请添加出库物料" };
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const now = new Date();
    const recordId = uuidv4();

    await db.insert(schema.outboundRecords).values({
      id: recordId,
      projectId,
      operatorId: user.id,
      totalAmount,
      remark: remark || null,
      createdAt: now,
    });

    let totalCost = 0;

    for (const item of items) {
      await db.insert(schema.outboundItems).values({
        id: uuidv4(),
        outboundId: recordId,
        materialId: item.materialId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        createdAt: now,
      });

      const material = await db
        .select()
        .from(schema.materials)
        .where(eq(schema.materials.id, item.materialId))
        .get();

      if (material) {
        const newQuantity = material.stockQuantity - item.quantity;
        await db
          .update(schema.materials)
          .set({
            stockQuantity: newQuantity < 0 ? 0 : newQuantity,
            updatedAt: now,
          })
          .where(eq(schema.materials.id, item.materialId));

        totalCost += item.quantity * material.purchasePrice;
      }
    }

    const project = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .get();

    if (project) {
      await db
        .update(schema.projects)
        .set({
          totalRevenue: project.totalRevenue + totalAmount,
          totalCost: project.totalCost + totalCost,
          totalProfit: project.totalProfit + (totalAmount - totalCost),
        })
        .where(eq(schema.projects.id, projectId));
    }

    revalidatePath("/outbound");
    revalidatePath("/materials");
    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "保存失败" };
  }
}
