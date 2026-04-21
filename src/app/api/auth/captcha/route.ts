import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 获取或创建验证码
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    if (!db) {
      return NextResponse.json({ success: false, error: "数据库不可用" }, { status: 500 });
    }

    // 生成数学验证码：a op b，答案为计算结果
    const ops = [
      { op: "+", min: 10, max: 50 },
      { op: "-", min: 5, max: 40 },
      { op: "+", min: 20, max: 80 },
      { op: "-", min: 10, max: 60 },
    ];
    const { op, min, max } = ops[Math.floor(Math.random() * ops.length)];
    const a = Math.floor(Math.random() * (max - min + 1)) + min;
    const b = Math.floor(Math.random() * (max - min + 1)) + min;
    // 确保减法结果为正
    const finalA = op === "-" && a < b ? b : a;
    const finalB = op === "-" && a < b ? a : b;
    const answer = op === "+" ? finalA + finalB : finalA - finalB;

    const captchaId = crypto.randomUUID();
    const expression = `${finalA} ${op} ${finalB} = ?`;
    const now = Date.now();

    // 清理 5 分钟前的旧验证码
    await db.prepare("DELETE FROM captcha WHERE expires_at < ?").bind(now - 5 * 60 * 1000).run();

    // 存入 D1
    await db
      .prepare(
        "INSERT INTO captcha (id, answer, expires_at) VALUES (?, ?, ?)"
      )
      .bind(captchaId, answer, now + 5 * 60 * 1000)
      .run();

    return NextResponse.json({
      success: true,
      data: { captchaId, expression },
    });
  } catch (error) {
    console.error("CAPTCHA error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
