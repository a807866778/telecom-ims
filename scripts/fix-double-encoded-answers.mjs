// 修复 training_exams 中双重 JSON 编码的 answer 字段
// 双重编码: "[\"A\"]" -> 库里存 ""[\"A\"]"" -> 正确值 "[\"A\"]"

const API_BASE = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const D1_DB_ID = "d7062eac-2d81-492a-bafc-926cc9227244";
const API_TOKEN = process.env.CF_API_TOKEN;

if (!API_TOKEN) {
  console.error("请设置 CF_API_TOKEN 环境变量");
  process.exit(1);
}

async function cfD1Query(sql) {
  const url = `${API_BASE}/accounts/${ACCOUNT_ID}/d1/database/${D1_DB_ID}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  return res.json();
}

function fixAnswer(raw) {
  if (!raw || raw === "") return raw;
  try {
    const first = JSON.parse(raw);          // 第一层解析
    const second = JSON.parse(first);       // 第二层解析
    return JSON.stringify(second);          // 重新正确序列化
  } catch {
    try {
      // 可能是单层编码，直接解析
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed);
    } catch {
      // 不是 JSON，直接返回（填空题等）
      return raw;
    }
  }
}

async function main() {
  // 1. 查所有题目
  const rows = await cfD1Query("SELECT id, question_type, answer FROM training_exams WHERE answer IS NOT NULL AND answer != ''");
  const records = rows.result?.[0]?.results || [];

  console.log(`共 ${records.length} 条 answer 需要检查`);

  for (const r of records) {
    const original = r.answer;
    const fixed = fixAnswer(original);
    if (original !== fixed) {
      console.log(`修复: ${r.id} (${r.question_type})`);
      console.log(`  原始: ${original}`);
      console.log(`  修正: ${fixed}`);
      const updateRes = await cfD1Query(`UPDATE training_exams SET answer = '${fixed.replace(/'/g, "''")}' WHERE id = '${r.id}'`);
      console.log(`  结果: ${JSON.stringify(updateRes)}`);
    } else {
      console.log(`OK: ${r.id} - 无需修复`);
    }
  }

  console.log("完成！");
}

main().catch(console.error);
