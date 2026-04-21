import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { db, schema } from "./index";

const { users, roles, userRoles, categories, materials, suppliers, projects } = schema;

// 默认权限定义
const PERMISSIONS = {
  // 物料管理
  MATERIAL_VIEW: "material:view",
  MATERIAL_CREATE: "material:create",
  MATERIAL_UPDATE: "material:update",
  MATERIAL_DELETE: "material:delete",

  // 入库管理
  INBOUND_VIEW: "inbound:view",
  INBOUND_CREATE: "inbound:create",
  INBOUND_DELETE: "inbound:delete",

  // 出库管理
  OUTBOUND_VIEW: "outbound:view",
  OUTBOUND_CREATE: "outbound:create",
  OUTBOUND_DELETE: "outbound:delete",

  // 项目管理
  PROJECT_VIEW: "project:view",
  PROJECT_CREATE: "project:create",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete",

  // 供应商管理
  SUPPLIER_VIEW: "supplier:view",
  SUPPLIER_CREATE: "supplier:create",
  SUPPLIER_UPDATE: "supplier:update",
  SUPPLIER_DELETE: "supplier:delete",

  // 报表
  REPORT_VIEW: "report:view",

  // 系统设置
  SETTINGS_VIEW: "settings:view",
  USER_MANAGE: "user:manage",
  ROLE_MANAGE: "role:manage",
};

// 角色模板
const ROLE_TEMPLATES = [
  {
    name: "超级管理员",
    permissions: Object.values(PERMISSIONS),
    isDefault: false,
  },
  {
    name: "仓管",
    permissions: [
      PERMISSIONS.MATERIAL_VIEW,
      PERMISSIONS.MATERIAL_CREATE,
      PERMISSIONS.MATERIAL_UPDATE,
      PERMISSIONS.INBOUND_VIEW,
      PERMISSIONS.INBOUND_CREATE,
      PERMISSIONS.INBOUND_DELETE,
      PERMISSIONS.PROJECT_VIEW,
      PERMISSIONS.SUPPLIER_VIEW,
      PERMISSIONS.SUPPLIER_CREATE,
    ],
    isDefault: false,
  },
  {
    name: "销售",
    permissions: [
      PERMISSIONS.MATERIAL_VIEW,
      PERMISSIONS.OUTBOUND_VIEW,
      PERMISSIONS.OUTBOUND_CREATE,
      PERMISSIONS.PROJECT_VIEW,
      PERMISSIONS.PROJECT_CREATE,
      PERMISSIONS.REPORT_VIEW,
    ],
    isDefault: false,
  },
  {
    name: "采购",
    permissions: [
      PERMISSIONS.MATERIAL_VIEW,
      PERMISSIONS.INBOUND_VIEW,
      PERMISSIONS.INBOUND_CREATE,
      PERMISSIONS.SUPPLIER_VIEW,
      PERMISSIONS.SUPPLIER_CREATE,
      PERMISSIONS.SUPPLIER_UPDATE,
    ],
    isDefault: false,
  },
  {
    name: "施工员",
    permissions: [
      PERMISSIONS.MATERIAL_VIEW,
      PERMISSIONS.OUTBOUND_VIEW,
      PERMISSIONS.OUTBOUND_CREATE,
      PERMISSIONS.PROJECT_VIEW,
    ],
    isDefault: false,
  },
  {
    name: "项目经理",
    permissions: [
      PERMISSIONS.MATERIAL_VIEW,
      PERMISSIONS.MATERIAL_CREATE,
      PERMISSIONS.INBOUND_VIEW,
      PERMISSIONS.OUTBOUND_VIEW,
      PERMISSIONS.OUTBOUND_CREATE,
      PERMISSIONS.PROJECT_VIEW,
      PERMISSIONS.PROJECT_CREATE,
      PERMISSIONS.PROJECT_UPDATE,
      PERMISSIONS.REPORT_VIEW,
    ],
    isDefault: false,
  },
];

// 物料分类
const CATEGORY_DATA = [
  { name: "光缆类", sort: 1 },
  { name: "设备类", sort: 2 },
  { name: "辅材类", sort: 3 },
  { name: "工具类", sort: 4 },
];

// 物料示例数据
const MATERIAL_DATA = [
  // 光缆类
  { name: "单模光缆", unit: "米", spec: "GYTA-4芯", purchasePrice: 3.5, salePrice: 6, category: "光缆类" },
  { name: "单模光缆", unit: "米", spec: "GYTA-8芯", purchasePrice: 5, salePrice: 8.5, category: "光缆类" },
  { name: "单模光缆", unit: "米", spec: "GYTA-12芯", purchasePrice: 7, salePrice: 12, category: "光缆类" },
  { name: "双绞线", unit: "米", spec: "CAT6", purchasePrice: 2, salePrice: 4, category: "光缆类" },
  // 设备类
  { name: "网络摄像机", unit: "台", spec: "400万像素-枪机", purchasePrice: 180, salePrice: 320, category: "设备类" },
  { name: "网络摄像机", unit: "台", spec: "400万像素-球机", purchasePrice: 350, salePrice: 580, category: "设备类" },
  { name: "网络摄像机", unit: "台", spec: "800万像素-枪机", purchasePrice: 280, salePrice: 480, category: "设备类" },
  { name: "交换机", unit: "台", spec: "8口POE", purchasePrice: 220, salePrice: 380, category: "设备类" },
  { name: "交换机", unit: "台", spec: "16口POE", purchasePrice: 450, salePrice: 750, category: "设备类" },
  { name: "硬盘录像机", unit: "台", spec: "8路NVR", purchasePrice: 380, salePrice: 650, category: "设备类" },
  { name: "硬盘录像机", unit: "台", spec: "16路NVR", purchasePrice: 580, salePrice: 950, category: "设备类" },
  { name: "监控硬盘", unit: "块", spec: "4TB", purchasePrice: 380, salePrice: 550, category: "设备类" },
  { name: "光纤收发器", unit: "对", spec: "千兆单模", purchasePrice: 85, salePrice: 150, category: "设备类" },
  // 辅材类
  { name: "光缆接头盒", unit: "个", spec: "12芯", purchasePrice: 35, salePrice: 65, category: "辅材类" },
  { name: "光缆接头盒", unit: "个", spec: "24芯", purchasePrice: 55, salePrice: 95, category: "辅材类" },
  { name: "尾纤", unit: "条", spec: "SC/UPC-3米", purchasePrice: 8, salePrice: 15, category: "辅材类" },
  { name: "光纤跳线", unit: "条", spec: "SC/UPC-SC/UPC-5米", purchasePrice: 15, salePrice: 28, category: "辅材类" },
  { name: "光缆终端盒", unit: "个", spec: "12口", purchasePrice: 25, salePrice: 45, category: "辅材类" },
  { name: "电源线", unit: "米", spec: "RVV2*1.0", purchasePrice: 3, salePrice: 5.5, category: "辅材类" },
  { name: "电源线", unit: "米", spec: "RVV2*1.5", purchasePrice: 4.5, salePrice: 8, category: "辅材类" },
  { name: "网线", unit: "米", spec: "CAT6户外防水", purchasePrice: 4, salePrice: 7, category: "辅材类" },
  { name: "PVC管", unit: "米", spec: "Φ25", purchasePrice: 3, salePrice: 5, category: "辅材类" },
  { name: "波纹管", unit: "米", spec: "Φ30", purchasePrice: 4, salePrice: 7, category: "辅材类" },
  { name: "水晶头", unit: "盒", spec: "RJ45-100个", purchasePrice: 25, salePrice: 45, category: "辅材类" },
  { name: "摄像机支架", unit: "个", spec: "万向节", purchasePrice: 15, salePrice: 28, category: "辅材类" },
  { name: "防水盒", unit: "个", spec: "中型", purchasePrice: 12, salePrice: 22, category: "辅材类" },
  // 工具类
  { name: "光纤熔接机", unit: "台", spec: "单芯", purchasePrice: 0, salePrice: 0, category: "工具类" },
  { name: "OTDR光时域反射仪", unit: "台", spec: "单模", purchasePrice: 0, salePrice: 0, category: "工具类" },
  { name: "光功率计", unit: "台", spec: "通用", purchasePrice: 0, salePrice: 0, category: "工具类" },
  { name: "红光笔", unit: "支", spec: "10mW", purchasePrice: 0, salePrice: 0, category: "工具类" },
];

// 供应商示例数据
const SUPPLIER_DATA = [
  { name: "杭州华光光缆有限公司", contactPerson: "张经理", phone: "138-0001-0001", address: "杭州市西湖区" },
  { name: "深圳海康威视经销商", contactPerson: "李经理", phone: "138-0002-0002", address: "深圳市南山区" },
  { name: "上海通用辅材供应商", contactPerson: "王经理", phone: "138-0003-0003", address: "上海市浦东新区" },
];

// 项目示例数据
const PROJECT_DATA = [
  {
    name: "XX小区光纤改造工程",
    clientName: "XX物业管理有限公司",
    contactPhone: "138-1234-5678",
    address: "杭州市XX区XX路XX小区",
    status: "进行中",
  },
  {
    name: "YY工业园监控安装项目",
    clientName: "YY工业园管理委员会",
    contactPhone: "139-2345-6789",
    address: "苏州市YY工业园",
    status: "进行中",
  },
  {
    name: "ZZ学校智慧校园项目",
    clientName: "ZZ学校",
    contactPhone: "137-3456-7890",
    address: "上海市ZZ区ZZ路100号",
    status: "已完成",
  },
];

async function seed() {
  console.log("开始初始化种子数据...");

  const now = new Date();

  // 1. 创建默认角色
  console.log("创建角色...");
  const roleIds: Record<string, string> = {};
  for (const template of ROLE_TEMPLATES) {
    const id = uuidv4();
    roleIds[template.name] = id;
    await db.insert(roles).values({
      id,
      name: template.name,
      permissions: JSON.stringify(template.permissions),
      isDefault: template.isDefault,
      createdAt: now,
    });
  }

  // 2. 创建默认管理员账号
  console.log("创建管理员账号...");
  const adminId = uuidv4();
  const passwordHash = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    id: adminId,
    username: "admin",
    passwordHash,
    realName: "系统管理员",
    createdAt: now,
  });

  // 绑定管理员角色
  await db.insert(userRoles).values({
    id: uuidv4(),
    userId: adminId,
    roleId: roleIds["超级管理员"],
  });

  // 创建演示账号
  console.log("创建演示账号...");
  const demoUsers = [
    { username: "cangguan", name: "仓管员", role: "仓管" },
    { username: "xiaoshou", name: "销售人员", role: "销售" },
    { username: "caigou", name: "采购员", role: "采购" },
    { username: "shigong", name: "施工员", role: "施工员" },
    { username: "xiangmu", name: "项目经理", role: "项目经理" },
  ];

  for (const demo of demoUsers) {
    const userId = uuidv4();
    await db.insert(users).values({
      id: userId,
      username: demo.username,
      passwordHash: await bcrypt.hash("123456", 10),
      realName: demo.name,
      createdAt: now,
    });
    await db.insert(userRoles).values({
      id: uuidv4(),
      userId,
      roleId: roleIds[demo.role],
    });
  }

  // 3. 创建物料分类
  console.log("创建物料分类...");
  const categoryIds: Record<string, string> = {};
  for (const cat of CATEGORY_DATA) {
    const id = uuidv4();
    categoryIds[cat.name] = id;
    await db.insert(categories).values({
      id,
      name: cat.name,
      sort: cat.sort,
    });
  }

  // 4. 创建物料
  console.log("创建物料...");
  for (const mat of MATERIAL_DATA) {
    await db.insert(materials).values({
      id: uuidv4(),
      name: mat.name,
      categoryId: categoryIds[mat.category],
      unit: mat.unit,
      spec: mat.spec,
      purchasePrice: mat.purchasePrice,
      salePrice: mat.salePrice,
      stockQuantity: Math.floor(Math.random() * 500) + 50,
      minStockWarning: 20,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 5. 创建供应商
  console.log("创建供应商...");
  for (const sup of SUPPLIER_DATA) {
    await db.insert(suppliers).values({
      id: uuidv4(),
      ...sup,
      createdAt: now,
    });
  }

  // 6. 创建项目
  console.log("创建项目...");
  const projectIds: string[] = [];
  for (const proj of PROJECT_DATA) {
    const id = uuidv4();
    projectIds.push(id);
    await db.insert(projects).values({
      id,
      ...proj,
      startDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });
  }

  console.log("种子数据初始化完成！");
  console.log("");
  console.log("默认账号:");
  console.log("  管理员: admin / admin123");
  console.log("  仓管: cangguan / 123456");
  console.log("  销售: xiaoshou / 123456");
  console.log("  采购: caigou / 123456");
  console.log("  施工: shigong / 123456");
  console.log("  项目: xiangmu / 123456");
}

// 执行种子数据
seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
