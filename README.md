# 电信IMS进销存管理系统

基于 Cloudflare Workers + Next.js 15 的企业级电信设备进销存管理系统，支持采购、销售、库存、项目、人员、安规培训等完整业务流程。

## 功能特性

### 核心模块

- ✅ **采购管理** - 采购订单、收货记录、退货处理
- ✅ **出库管理** - 出库单、退库单
- ✅ **项目管理** - 项目列表、成本核算、利润统计
- ✅ **仓储管理** - 库存查询、入库记录、出库记录、报溢报损、库存盘点
- ✅ **档案管理** - 商品管理、经销商档案、项目合同
- ✅ **人员管理** - 员工档案、健康档案、证照档案
- ✅ **安规培训** - 培训内容、在线考核、培训记录
- ✅ **售后管理** - 客户投诉、设备售后
- ✅ **仪表盘** - 数据统计、利润图表、待办事项

### 系统特性

- ✅ **多用户系统** - 角色权限管理
- ✅ **响应式设计** - 支持手机、平板、电脑访问
- ✅ **文件上传** - 支持图片和文档上传（R2存储）
- ✅ **数据安全** - 密码加密存储、会话管理

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 15.3.0 + React 19 |
| 样式 | Tailwind CSS v4 |
| 数据库 | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| 对象存储 | Cloudflare R2 |
| 部署平台 | Cloudflare Workers |
| 构建工具 | OpenNext Cloudflare |

## 快速开始

### 环境要求

- Node.js 20.x+
- Wrangler CLI 3.x+
- Cloudflare 账号

### 安装

```bash
# 克隆项目
git clone https://github.com/a807866778/telecom-ims.git
cd telecom-ims

# 安装依赖
npm install

# 本地开发
npm run dev
```

### 部署

详细部署步骤请参考 [部署文档](部署文档.md)。

```bash
# 构建
npm run build:cf

# 部署
npx wrangler deploy
```

## 默认账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 超级管理员 |

> ⚠️ 首次登录后请立即修改密码

## 项目结构

```
telecom-ims/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/       # 管理后台页面
│   │   │   ├── dashboard/     # 首页仪表盘
│   │   │   ├── purchase/      # 采购管理
│   │   │   ├── outbound/      # 出库管理
│   │   │   ├── projects/      # 项目管理
│   │   │   ├── warehouse/     # 仓储管理
│   │   │   ├── archive/       # 档案管理
│   │   │   ├── staff/         # 人员管理
│   │   │   ├── training/      # 安规培训
│   │   │   ├── service/       # 售后管理
│   │   │   └── settings/      # 系统设置
│   │   ├── api/               # API 路由
│   │   └── login/             # 登录页
│   ├── components/            # UI 组件
│   └── lib/                   # 工具库
├── drizzle/                  # 数据库迁移
├── migrations/               # SQL 迁移
├── wrangler.toml            # Cloudflare 配置
└── package.json
```

## 文档

- [操作手册](操作手册.md) - 系统功能使用指南
- [部署文档](部署文档.md) - 部署配置详细说明

## 许可证

MIT
