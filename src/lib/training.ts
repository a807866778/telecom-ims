// 安规培训 Server Actions
"use server"

import { revalidatePath } from "next/cache"
import { db, schema } from "./db/index"
import { eq, desc } from "drizzle-orm"
import { sql } from "drizzle-orm"

const { trainingModules: trainingModulesTable, trainingRecords: trainingRecordsTable } = schema

export type TrainingModuleType = {
  id: string
  title: string
  category: string
  content: string
  passingScore: number
  createdAt: string
}

export type TrainingRecordType = {
  id: string
  userId: string
  moduleId: string
  score: number
  passed: boolean
  completedAt: string
}

// 获取培训模块列表
export async function getTrainingModules(): Promise<TrainingModuleType[]> {
  try {
    const results = await db.select().from(trainingModulesTable).orderBy(desc(trainingModulesTable.createdAt))
    return results.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      passingScore: row.passingScore,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString().split("T")[0] : String(row.createdAt),
    }))
  } catch (error) {
    console.error("Failed to fetch training modules:", error)
    return []
  }
}

// 获取单个培训模块
export async function getTrainingModule(id: string): Promise<TrainingModuleType | null> {
  try {
    const result = await db.select().from(trainingModulesTable).where(eq(trainingModulesTable.id, id)).limit(1)
    if (result.length === 0) return null
    const row = result[0]
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      passingScore: row.passingScore,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString().split("T")[0] : String(row.createdAt),
    }
  } catch (error) {
    console.error("Failed to fetch training module:", error)
    return null
  }
}

// 获取培训记录
export async function getTrainingRecords(userId?: string): Promise<TrainingRecordType[]> {
  try {
    let results
    if (userId) {
      results = await db.select().from(trainingRecordsTable)
        .where(eq(trainingRecordsTable.userId, userId))
        .orderBy(desc(trainingRecordsTable.completedAt))
    } else {
      results = await db.select().from(trainingRecordsTable)
        .orderBy(desc(trainingRecordsTable.completedAt))
    }
    return results.map((row) => ({
      id: row.id,
      userId: row.userId,
      moduleId: row.moduleId,
      score: row.score,
      passed: Boolean(row.passed),
      completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString().split("T")[0] : String(row.completedAt),
    }))
  } catch (error) {
    console.error("Failed to fetch training records:", error)
    return []
  }
}

// 提交培训考核成绩
export async function submitTrainingRecord(
  moduleId: string,
  score: number,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 获取模块信息检查及格分数
    const module = await getTrainingModule(moduleId)
    if (!module) {
      return { success: false, message: "培训模块不存在" }
    }

    const passed = score >= module.passingScore
    const recordId = `tr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = new Date()

    await db.insert(trainingRecordsTable).values({
      id: recordId,
      userId,
      moduleId,
      score,
      passed,
      completedAt: now,
    })

    revalidatePath("/training")
    return {
      success: true,
      message: passed ? "考核通过！" : `得分 ${score} 分，未达及格线 ${module.passingScore} 分`,
    }
  } catch (error) {
    console.error("Failed to submit training record:", error)
    return { success: false, message: "提交失败，请重试" }
  }
}

// 获取培训统计
export async function getTrainingStats(userId?: string): Promise<{
  totalModules: number
  completedCount: number
  passRate: number
}> {
  try {
    const modules = await getTrainingModules()
    const records = await getTrainingRecords(userId)
    const passedRecords = records.filter((r) => r.passed)

    return {
      totalModules: modules.length,
      completedCount: records.length,
      passRate: records.length > 0 ? Math.round((passedRecords.length / records.length) * 100) : 0,
    }
  } catch (error) {
    console.error("Failed to fetch training stats:", error)
    return {
      totalModules: 0,
      completedCount: 0,
      passRate: 0,
    }
  }
}

// 创建培训模块（管理员）
export async function createTrainingModule(
  title: string,
  category: string,
  content: string,
  passingScore: number = 80
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const id = `tm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = new Date()

    await db.insert(trainingModulesTable).values({
      id,
      title,
      category,
      content,
      passingScore,
      createdAt: now,
    })

    revalidatePath("/training")
    return { success: true, message: "培训模块创建成功", id }
  } catch (error) {
    console.error("Failed to create training module:", error)
    return { success: false, message: "创建失败，请重试" }
  }
}

// 初始化默认培训模块（如果数据库为空）
export async function initDefaultTrainingModules(): Promise<void> {
  try {
    const existing = await getTrainingModules()
    if (existing.length > 0) return // 已有数据，跳过

    const defaultModules = [
      {
        title: "光缆施工安全规范",
        category: "光缆工程",
        content: `一、施工前准备
1. 作业人员必须持有有效的上岗证书
2. 施工前应进行安全交底，明确作业内容和危险点
3. 检查施工工具和设备是否完好

二、光缆敷设安全
1. 严格遵守电信线路施工安全规程
2. 在电力线路附近作业时，保持安全距离
3. 使用机械设备时，操作人员需经过专业培训

三、熔接作业安全
1. 熔接机使用前检查设备接地
2. 避免在潮湿环境下进行熔接作业
3. 熔接废料及时收集处理`,
        passingScore: 80,
      },
      {
        title: "高处作业安全规范",
        category: "通用安全",
        content: `一、高处作业定义
凡在坠落高度基准面2米以上（含2米）有可能坠落的高处进行作业，均称为高处作业。

二、安全要求
1. 从事高处作业人员必须经过体检，患有高血压、心脏病等人员禁止高处作业
2. 高处作业必须系好安全带，安全带应高挂低用
3. 作业区域应设置警戒线和警示标志

三、脚手架安全
1. 脚手架搭设必须符合安全技术规范
2. 脚手架上禁止堆放过重物品
3. 风雨雪天气禁止露天高处作业`,
        passingScore: 75,
      },
      {
        title: "井下作业安全规范",
        category: "管道工程",
        content: `一、作业前准备
1. 检测井下氧气含量，确保不低于18%
2. 检测可燃气体和有毒气体
3. 穿戴好安全防护装备

二、作业安全
1. 井口设置专人监护
2. 使用安全电压照明
3. 作业时间不宜过长，每30分钟轮换一次

三、应急救援
1. 配备应急救援装备
2. 制定应急救援预案
3. 定期组织演练`,
        passingScore: 80,
      },
      {
        title: "电气安全操作规程",
        category: "通用安全",
        content: `一、基本要求
1. 非电气作业人员禁止操作电气设备
2. 电气设备定期检查维护
3. 发现电气隐患立即报告处理

二、施工用电安全
1. 临时用电必须安装漏电保护器
2. 禁止私拉乱接电线
3. 电气设备金属外壳必须接地

三、触电急救
1. 发现有人触电，立即切断电源
2. 对触电者进行人工呼吸急救
3. 立即拨打120急救电话`,
        passingScore: 85,
      },
    ]

    for (const module of defaultModules) {
      await createTrainingModule(module.title, module.category, module.content, module.passingScore)
    }
  } catch (error) {
    console.error("Failed to init default training modules:", error)
  }
}
