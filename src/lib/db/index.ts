import { drizzle } from "drizzle-orm/libsql";
import { eq, desc, and, gte, lt, like, or, isNull, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// 导出 drizzle
export { drizzle };

// 导出操作符
export { eq, desc, and, gte, lt, like, or, isNull, sql };
export { sqliteTable, text, integer, real };

// 导出 schema
import * as schemaModule from "./schema";
export { schemaModule as schema };

// Context 类型
interface C {
  env?: {
    DB: any;
    [key: string]: any;
  };
  waitUntil?: (promise: Promise<any>) => void;
  passThroughOnException?: () => void;
}

// 获取 D1 数据库
function getD1Db(c?: C): any {
  // 优先从 context 获取
  if (c?.env?.DB) {
    return c.env.DB;
  }
  
  // Cloudflare Workers 全局方式
  if (typeof globalThis !== "undefined") {
    const env = (globalThis as any).env;
    if (env?.DB) {
      return env.DB;
    }
  }
  
  return null;
}

// 创建带 context 的 drizzle 实例
export function createDb(c?: C) {
  const d1 = getD1Db(c);
  if (d1) {
    return drizzle(d1);
  }
  
  // 返回 mock 对象避免崩溃
  console.warn("D1 not available, using mock");
  return {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
        all: () => Promise.resolve([]),
        get: () => Promise.resolve(null),
        orderBy: () => ({ limit: () => Promise.resolve([]), then: () => Promise.resolve([]) }),
        limit: () => Promise.resolve([])
      })
    }),
    insert: () => ({
      values: () => Promise.resolve({ lastInsertRowid: "0" })
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve({})
      })
    }),
    delete: () => ({
      where: () => Promise.resolve({})
    })
  } as any;
}

// 全局 context 存储（由中间件设置）
let globalContext: C | null = null;

export function setContext(c: C) {
  globalContext = c;
}

export function getContext(): C | null {
  return globalContext;
}

// getDb - 获取数据库实例
export function getDb(c?: C) {
  return createDb(c || globalContext);
}

// db - 兼容模式
export const db = createDb();
