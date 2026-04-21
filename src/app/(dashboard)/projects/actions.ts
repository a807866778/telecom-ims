"use server";

import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("project:create")) {
    return { error: "没有权限" };
  }

  const name = formData.get("name") as string;
  const clientName = formData.get("clientName") as string;
  const contactPhone = formData.get("contactPhone") as string;
  const address = formData.get("address") as string;
  const status = formData.get("status") as string;
  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;

  if (!name) {
    return { error: "项目名称不能为空" };
  }

  const now = new Date();

  await db.insert(schema.projects).values({
    id: uuidv4(),
    name,
    clientName: clientName || null,
    contactPhone: contactPhone || null,
    address: address || null,
    status: status || "进行中",
    startDate: startDateStr ? new Date(startDateStr) : null,
    endDate: endDateStr ? new Date(endDateStr) : null,
    createdAt: now,
  });

  revalidatePath("/projects");
  redirect("/projects");
}
