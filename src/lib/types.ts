// ===== 核心数据模型 =====

export type PetSpecies = "cat" | "dog" | "rabbit" | "bird" | "other";
export type PetGender = "male" | "female" | "unknown";

export interface Pet {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string;        // 品种（如"金毛"）
  age: number;          // 岁
  weight: number;       // 公斤
  gender: PetGender;
  avatar: string;       // emoji 头像（v0.1 不接图片上传）
  birthday?: string;    // ISO date
  notes?: string;
  createdAt: string;
}

export type RecordType = "photo" | "note" | "weight" | "medical";

export interface PetRecord {
  id: string;
  petId: string;
  type: RecordType;
  title: string;
  content: string;
  imageDataUrl?: string; // base64 拍摄图片
  meta?: Record<string, string | number>;
  createdAt: string;
}

export type QuestionType = "饮食" | "疾病" | "行为" | "用药";

export interface QAChat {
  id: string;
  petId?: string;
  type: QuestionType;
  question: string;
  answer: string;
  isVipOnly?: boolean;
  relatedDrugIds?: string[];
  createdAt: string;
}

/**
 * Drug 商品数据
 *
 * v0.4.0 改造 (实施员 3 负责):
 * - 分类扩 7 → 11(新增:心脏 / 肾脏 / 眼耳 / 抗感染 / 止痛 / 其他)
 *   注: 旧 "营养" / "眼耳口" 在 v0.4.0 仍保留(向后兼容老药品),但 11 分类是新主类
 * - 新增字段:
 *   - `indications[]`  正式适应症列表(与 `symptoms` 配合;symptoms 用于搜索关键词快筛,indications 给详情页展示)
 *   - `contraindications` 禁忌(原 plan 字段 `notice` 改名为 `contraindications` 与 UI 文案统一)
 *   - `isPromoted` 推广标记(plan 字段名 `promoted` / impl 字段名 `sponsored`;本项目统称 `isPromoted`)
 *   - `promotedRank` 推广排序权重(数字越大越靠前)
 * - `description` 长度 50-100 字(原 10 字左右太短;v0.4.0 详情页主展示字段)
 *
 * 严格约束 (实施员 3 任务书):
 * - 全部 52 款药品 Free 用户都可看(不藏药,只对 vipOnly 药品模糊详情)
 * - 推广药只能 3-5 款(在 src/lib/drugs/seed-v040.ts 里 hard-code;不开放运行时切换)
 */
export interface Drug {
  id: string;
  name: string;
  category:
    | "驱虫"
    | "疫苗"
    | "肠胃"
    | "皮肤"
    | "关节"
    | "营养"
    | "眼耳口"   // v0.4 之前的老分类,保留以兼容老 seedDrugs
    | "心脏"
    | "肾脏"
    | "眼耳"
    | "抗感染"
    | "止痛"
    | "其他";
  /** 适用症状关键词(老字段,保留供搜索快筛;新药品也填 3-5 个) */
  symptoms: string[];
  /** 正式适应症列表(50-100 字说明,详情页主展示) */
  description: string;
  /** 正式适应症条目(数组,详情页 chip 化展示) */
  indications: string[];
  /** 用法用量 */
  dosage: string;
  /** 副作用/不良反应 */
  sideEffects: string;
  /** 禁忌症(新增字段;v0.4.0 详情页必显) */
  contraindications: string;
  price: number;        // 元
  prescription: boolean; // 是否处方药
  forSpecies: PetSpecies[]; // 适用动物
  vipOnly?: boolean;    // 仅 Standard/Senior 可查看完整信息
  /** v0.4.0 推广标记(只有 3-5 款为 true;搜索结果排前 + 显示红色徽章) */
  isPromoted?: boolean;
  /** v0.4.0 推广排序权重(数字越大越靠前;非推广药缺省) */
  promotedRank?: number;
}

// v0.4.0 — 4 档会员(收口:free / trial / standard / senior)
//
// **字段名 MUST-03 拍板**:trial 字段统一定义为
//   `trialStartedAt` / `trialEndsAt` / `couponCode`(plan §2.1 + impl §4.1/§4.4 一致)
//
// 老档位 vip / svip / lifetime 的迁移表在 `src/lib/admin/migrate.ts`
// (不在 types.ts 暴露给 UI)
export type MembershipTier = "free" | "trial" | "standard" | "senior";

/** 视觉主题(与 tier 独立,见 plan F-THEME-01) */
export type ThemeMode = "young" | "senior";

// ===== v0.4.0.2 P1-6 — 装扮系统(独立于主题,纯外观装饰;MVP 1.0)=====
/** 主题色:3 选 1(default/warm/cool) */
export type ColorTheme = "default" | "warm" | "cool";
/** 背景图:2 选 1(none/paw) */
export type BgImage = "none" | "paw";

/** 装扮状态(localStorage 持久化;不进 store membership) */
export interface DecorationState {
  colorTheme: ColorTheme;
  bgImage: BgImage;
}

/** 装扮商品(装扮商店里卖的) */
export interface DecorationItem {
  id: string;
  kind: "color" | "bg";
  /** 唯一 key:ColorTheme 或 BgImage 值 */
  value: ColorTheme | BgImage;
  name: string;
  emoji: string;
  /** 积分价格 */
  price: number;
  /** 预览色(Tailwind class) */
  preview: string;
}

export interface Membership {
  tier: MembershipTier;
  expiresAt: string | null;
  // v0.4.0 — 试用版字段(仅 tier=trial 时有值)
  // MUST-03:字段名统一定义;不是 startedAt / activatedAt
  trialStartedAt?: string;
  trialEndsAt?: string;
  /** 试用转化券码(trial → standard 7 折;由 versions.ts.generateTrialCoupon 生成) */
  couponCode?: string;
  /** 当前主题(独立于 tier;见 plan F-THEME-01) */
  theme: ThemeMode;
  /** 用户积分(v0.4.0 仅记账,无消费;v0.4.1 才实现 spendPoints) */
  points: number;
  history: Array<{ tier: MembershipTier; startedAt: string; expiresAt: string; amount: number }>;
}

// ===== v0.4.0 · 版本矩阵(实施员 2 负责)=====
// 4 档会员 × 7 字段能力矩阵(plan §2.7 / impl §4.1)
//
// 设计:
// - `VersionMatrix.version` 当前生效版本号(从 package.json 同步,默认 "0.4.0")
// - `VersionMatrix.releasedAt` 矩阵落盘时间(每次 rollback 也会更新)
// - 4 档分别有自己的 `VersionCapabilities` 实例
// - `viewAsTier`(admin 切档预览)不在 VersionMatrix 里,在 store 单独 state

/** 单档会员能力配置 */
export interface VersionCapabilities {
  /** 是否展示广告(Standard/Senior 完全免;v0.4.0 实现) */
  adsEnabled: boolean;
  /** 是否允许导出全量 JSON(基础权利,所有档都给) */
  exportData: boolean;
  /** 是否启用云同步(v0.4.0 仍 false;senior 可作为"卖点"打开) */
  cloudSync: boolean;
  /** 是否允许多宠物档案(所有档都给;v0.4.0 不再限制) */
  multiPet: boolean;
  /** 是否允许切换主题(free 锁死 young;senior 锁死 senior) */
  customTheme: boolean;
  /** 是否可开启 3 天试用(仅首次访问的新用户) */
  trialEligible: boolean;
  /** OTA 接收通道(stable/beta/internal;v0.4.0 仅 stable) */
  otaChannel: "stable" | "beta" | "internal";
}

/** 4 档 × 7 字段能力矩阵 */
export interface VersionMatrix {
  /** 当前版本(包 package.json 的 version 同步) */
  version: string;
  /** 发布时间(ISO) */
  releasedAt: string;
  /** free 档能力 */
  free: VersionCapabilities;
  /** trial 档能力 */
  trial: VersionCapabilities;
  /** standard 档能力 */
  standard: VersionCapabilities;
  /** senior 档能力 */
  senior: VersionCapabilities;
}

export interface DailyTip {
  id: string;
  title: string;
  content: string;
  category: "饮食" | "健康" | "行为" | "季节";
  icon: string;
  publishedAt: string;  // ISO date (YYYY-MM-DD)
}

export type AnnouncementType = "update" | "event" | "maintenance";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  publishedAt: string;  // ISO
  version?: string;    // 用于"持续更新机制"展示
}

export type AdSlotType = "banner" | "sidebar" | "bottom" | "popup";

export interface AdConfig {
  id: string;
  type: AdSlotType;
  title: string;
  description: string;
  badge: string;        // 角标文字（如"广告"）
  bgGradient: string;   // tailwind class
  emoji: string;
  ctaText: string;
  weight: number;       // 权重（越高越优先）
  active: boolean;
}

// ===== v0.2 新增类型 =====

// ----- 提醒中心 -----
export type ReminderCategory = "喂药" | "驱虫" | "疫苗" | "洗澡" | "美容" | "复诊" | "其他";

export interface Reminder {
  id: string;
  petId: string;
  category: ReminderCategory;
  title: string;
  description?: string;
  // 重复规则：'once' 一次性 / 'daily' 每天 / 'weekly' 每周 / 'monthly' 每月 / 'quarterly' 每季 / 'yearly' 每年
  repeat: "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  nextAt: string;          // 下次提醒时间 ISO
  remindBefore?: number;   // 提前多少分钟提醒，默认 30
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

// ----- 健康打卡 -----
export type HealthCheckType = "便便" | "尿尿" | "呕吐" | "精神" | "食欲" | "饮水";

export interface HealthCheck {
  id: string;
  petId: string;
  type: HealthCheckType;
  // 评分：1-5 颗星（精神/食欲/饮水），其他为描述（颜色/形状/量）
  rating?: 1 | 2 | 3 | 4 | 5;
  note?: string;            // 备注（如"软便""黄色""少量"）
  createdAt: string;
}

// ----- 遛狗打卡 -----
export interface WalkLog {
  id: string;
  petId: string;
  durationMin: number;     // 时长（分钟）
  distanceKm?: number;     // 距离（公里，可选）
  note?: string;
  createdAt: string;
}

// ----- 附近地点 -----
export type PlaceCategory = "hospital" | "petshop" | "grooming" | "park";

export interface NearbyPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string;
  distance: number;          // 距离（公里）
  phone: string;
  rating: number;            // 1-5
  openHours: string;
  tags: string[];
  lat: number;
  lng: number;
}

// ----- 食物 / 猫粮狗粮 -----
export interface FoodItem {
  id: string;
  brand: string;            // 品牌
  name: string;             // 产品名
  forSpecies: PetSpecies[]; // 适用动物
  lifeStage: "幼" | "成" | "老" | "全期";
  // 关键成分（百分比）
  crudeProtein: number;     // 粗蛋白
  crudeFat: number;         // 粗脂肪
  crudeFiber: number;       // 粗纤维
  moisture: number;         // 水分
  // 配料表前 3 项
  topIngredients: string[];
  // 是否含有敏感成分
  hasGrain: boolean;
  hasArtificialAdditive: boolean; // 人工添加剂
  hasAllergen: string[];          // 已知过敏原
  pricePerKg: number;             // 元/kg
  rating: number;                 // 综合评分 1-5
  // 适配标签
  suitableFor: string[];     // 适用场景标签
  notSuitableFor: string[];  // 不适用场景
}

export interface FoodCheck {
  id: string;
  petId: string;
  foodId: string;
  score: number;            // 0-100 适配分
  summary: string;          // AI 总结
  pros: string[];           // 优点
  cons: string[];           // 缺点
  createdAt: string;
}

// ----- 宠物档案卡（分享用）-----
export interface PetShareCard {
  petId: string;
  generatedAt: string;
  template: "warm" | "cute" | "cool"; // 卡片风格
}

// ===== v0.3 新增类型 =====

// ----- 成就系统 -----
export type AchievementCategory = "打卡" | "记录" | "问答" | "收藏" | "收藏" | "互动" | "里程碑";

export interface Achievement {
  id: string;
  title: string;
  description: string;       // 解锁条件描述
  emoji: string;
  category: AchievementCategory;
  rarity: "common" | "rare" | "epic" | "legendary";
  // 触发条件：函数表达式（数据驱动，由 store 内部检查）
  // 简化为：一个 condition string + 数值（checkAchievements 内部 switch）
  condition: string;         // 例如 "consecutive_checkin_7"
  threshold?: number;        // 阈值（天数/次数）
}

export interface AchievementUnlock {
  achievementId: string;
  unlockedAt: string;        // ISO
  // 触发该次解锁的统计快照（用于成就墙展示）
  context?: string;
}

// ----- 训练课程 -----
export type CourseCategory = "基础" | "行为" | "技能" | "社交";

export interface CourseStep {
  id: string;
  title: string;
  description: string;
  durationMin: number;       // 建议耗时
  tips?: string[];           // 小贴士
}

export interface Course {
  id: string;
  title: string;
  category: CourseCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;   // 1 最易 5 最难
  durationDays: number;      // 建议总训练天数
  forSpecies: PetSpecies[];
  coverEmoji: string;
  summary: string;           // 1 句话简介
  steps: CourseStep[];
}

export interface CourseProgress {
  courseId: string;
  petId: string;
  completedStepIds: string[];
  startedAt: string;
  updatedAt: string;
}

// ----- 每日任务 -----
export type TaskType = "拍照" | "打卡" | "问答" | "浏览" | "训练" | "分享" | "互动";

export interface TaskDefinition {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  emoji: string;
  // 触发条件
  condition: "add_record" | "add_healthcheck" | "add_walk" | "ask_qa" | "view_updates" | "complete_step" | "share_card" | "add_pet";
  // 经验值奖励
  xp: number;
}

export interface TaskCompletion {
  taskId: string;
  date: string;              // YYYY-MM-DD
  petId?: string;            // 可选关联宠物
  completedAt: string;       // ISO
}

// ----- AI 宠物角色对话 -----
export type PetMood = "happy" | "sleepy" | "hungry" | "playful" | "shy" | "grumpy" | "curious" | "missing";

export interface PetTalk {
  id: string;
  petId: string;
  userMessage: string;
  petReply: string;
  mood: PetMood;
  createdAt: string;
}

// ----- 年度成长报告 -----
export interface PetDiary {
  petId: string;
  period: "month" | "year";
  // 该周期内统计
  totalRecords: number;
  totalHealthChecks: number;
  totalWalks: number;
  totalQA: number;
  weightChange?: number;     // 体重变化
  topKeywords: string[];     // 高频关键词
  highlights: string[];      // 重要事件（3-5 条）
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
}
