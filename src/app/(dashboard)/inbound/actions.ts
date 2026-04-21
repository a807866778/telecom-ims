"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

interface InboundItemData {
  materialId: string;
  quantity: number;
  unitPrice: number;
}

export async function createInboundRecord(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("inbound:create")) {
    return { error: "没有权限" };
  }

  try {
    const supplierId = formData.get("supplierId") as string;
    const remark = formData.get("remark") as string;
    const itemsStr = formData.get("items") as string;
    const photosStr = formData.get("photos") as string;

    if (!supplierId) {
      return { error: "请选择供应商" };
    }

    if (!itemsStr) {
      return { error: "请添加入库物料" };
    }

    const items: InboundItemData[] = JSON.parse(itemsStr);
    if (items.length === 0) {
      return { error: "请添加入库物料" };
    }

    const photos: string[] = photosStr ? JSON.parse(photosStr) : [];

    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const now = new Date();
    const recordId = uuidv4();

    await db.insert(schema.inboundRecords).values({
      id: recordId,
      supplierId,
      operatorId: user.id,
      totalAmount,
      remark: remark || null,
      photoUrl: photos.length > 0 ? photos.join(",") : null,
      createdAt: now,
    });

    for (const item of items) {
      await db.insert(schema.inboundItems).values({
        id: uuidv4(),
        inboundId: recordId,
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
        await db
          .update(schema.materials)
          .set({
            stockQuantity: material.stockQuantity + item.quantity,
            updatedAt: now,
          })
          .where(eq(schema.materials.id, item.materialId));
      }
    }

    revalidatePath("/inbound");
    revalidatePath("/materials");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "保存失败" };
  }
}
