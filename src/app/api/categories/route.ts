import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET - 获取所有分类
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    const result = await db.prepare("SELECT * FROM categories ORDER BY name").all();

    return NextResponse.json({ success: true, data: result.results || [] });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
