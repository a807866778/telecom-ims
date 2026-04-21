"use server";

import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSupplier(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("supplier:create")) {
    return { error: "没有权限" };
  }

  const name = formData.get("name") as string;
  const contactPerson = formData.get("contactPerson") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const remark = formData.get("remark") as string;

  if (!name) {
    return { error: "供应商名称不能为空" };
  }

  await db.insert(schema.suppliers).values({
    id: uuidv4(),
    name,
    contactPerson: contactPerson || null,
    phone: phone || null,
    address: address || null,
    remark: remark || null,
    createdAt: new Date(),
  });

  revalidatePath("/suppliers");
  redirect("/suppliers");
}
