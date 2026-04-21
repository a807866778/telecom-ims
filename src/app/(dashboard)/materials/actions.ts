"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMaterial(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("material:create")) {
    return { error: "没有权限" };
  }

  const name = formData.get("name") as string;
  const categoryId = formData.get("categoryId") as string;
  const unit = formData.get("unit") as string;
  const spec = formData.get("spec") as string;
  const purchasePrice = parseFloat(formData.get("purchasePrice") as string) || 0;
  const salePrice = parseFloat(formData.get("salePrice") as string) || 0;
  const stockQuantity = parseFloat(formData.get("stockQuantity") as string) || 0;
  const minStockWarning = parseFloat(formData.get("minStockWarning") as string) || 0;

  if (!name || !unit) {
    return { error: "名称和单位不能为空" };
  }

  const now = new Date();

  await db.insert(schema.materials).values({
    id: uuidv4(),
    name,
    categoryId: categoryId || null,
    unit,
    spec: spec || null,
    purchasePrice,
    salePrice,
    stockQuantity,
    minStockWarning,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/materials");
  redirect("/materials");
}

export async function updateMaterial(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("material:update")) {
    return { error: "没有权限" };
  }

  const name = formData.get("name") as string;
  const categoryId = formData.get("categoryId") as string;
  const unit = formData.get("unit") as string;
  const spec = formData.get("spec") as string;
  const purchasePrice = parseFloat(formData.get("purchasePrice") as string) || 0;
  const salePrice = parseFloat(formData.get("salePrice") as string) || 0;
  const stockQuantity = parseFloat(formData.get("stockQuantity") as string) || 0;
  const minStockWarning = parseFloat(formData.get("minStockWarning") as string) || 0;

  if (!name || !unit) {
    return { error: "名称和单位不能为空" };
  }

  await db
    .update(schema.materials)
    .set({
      name,
      categoryId: categoryId || null,
      unit,
      spec: spec || null,
      purchasePrice,
      salePrice,
      stockQuantity,
      minStockWarning,
      updatedAt: new Date(),
    })
    .where(eq(schema.materials.id, id));

  revalidatePath("/materials");
  redirect("/materials");
}

export async function deleteMaterial(id: string) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("material:delete")) {
    return { error: "没有权限" };
  }

  await db.delete(schema.materials).where(eq(schema.materials.id, id));
  revalidatePath("/materials");
}
