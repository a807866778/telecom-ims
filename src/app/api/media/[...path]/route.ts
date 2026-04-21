import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// GET /api/media/inbound/xxx.jpg - 获取R2中的文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const fileName = path.join("/");

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "缺少文件路径" },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();
    const bucket = env.MEDIA_BUCKET;

    if (!bucket) {
      return NextResponse.json(
        { success: false, error: "存储服务不可用" },
        { status: 500 }
      );
    }

    const object = await bucket.get(fileName);

    if (!object) {
      return NextResponse.json(
        { success: false, error: "文件不存在" },
        { status: 404 }
      );
    }

    const data = await object.arrayBuffer();

    return new NextResponse(data, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "ETag": object.httpEtag,
      },
    });
  } catch (error: any) {
    console.error("Get file error:", error);
    return NextResponse.json(
      { success: false, error: "获取文件失败" },
      { status: 500 }
    );
  }
}
