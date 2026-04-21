import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: "没有上传文件" },
        { status: 400 }
      );
    }

    // 检查文件类型 - 支持图片和文档
    const allowedTypes = [
      // 图片
      "image/jpeg", "image/png", "image/gif", "image/webp",
      // PDF
      "application/pdf",
      // Word 文档
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "不支持的文件类型，仅支持 JPG、PNG、GIF、WebP、PDF、DOC、DOCX" },
        { status: 400 }
      );
    }

    // 检查文件大小 (图片最大 5MB, 文档最大 20MB)
    const isImage = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type);
    const maxSize = isImage ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: `文件大小超过限制（${isImage ? "最大 5MB" : "最大 20MB"}）` },
        { status: 400 }
      );
    }

    // 获取 R2 bucket
    const { env } = getCloudflareContext();
    const bucket = env.MEDIA_BUCKET;

    if (!bucket) {
      return NextResponse.json(
        { success: false, error: "存储服务不可用" },
        { status: 500 }
      );
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    // 根据文件类型选择存储目录
    const folder = isImage ? "images" : "documents";
    const fileName = `${folder}/${timestamp}-${randomStr}.${ext}`;

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 上传到 R2
    await bucket.put(fileName, buffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // 返回文件 URL (相对路径，通过 /api/media 代理访问)
    const fileUrl = `/api/media/${fileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "上传失败" },
      { status: 500 }
    );
  }
}

// 获取上传的图片
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const fileName = url.searchParams.get("file");

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "缺少文件名" },
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
        "Cache-Control": "public, max-age=31536000",
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
