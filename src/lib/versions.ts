// ===== 4 档会员权限矩阵 + 试用版特殊逻辑 =====
//
// v0.4.0 实施依据:implementation.md §4.1 / §4.2
// 字段名:MUST-03 统一为 `trialStartedAt` / `trialEndsAt`(不是 startedAt/activatedAt)
//
// 设计原则:
// - 主题切换**免费**(不锁会员档):任何 tier 都可切 young / senior
// - 试用到期**数据保留**:trial 状态字段保留,业务数据(宠物/记录/提醒)原封不动
// - Senior 档**强制 senior 主题**(+ theme=senior 自动锁定):仅 Senior 专属
// - Standard 档**主题自由切换**:trial/standard 可切 senior
// - Free 档**不开放**主题切换(Free 无 premium 体验权益)

import type { MembershipTier } from "./types";

// ===== 主题(与 ./theme 互不耦合:此处是"档位是否允许切主题",./theme 是"实际切换")=====
export type ThemeMode = "young" | "senior";

// ===== 4 档会员档的元信息 =====
export interface TierMeta {
  tier: MembershipTier;
  /** 中文显示名(UI 用) */
  label: string;
  /** 一句话简介(卡片副标题) */
  tagline: string;
  /** 卡片 emoji 角标 */
  emoji: string;
  /** 卡片背景渐变(tailwind class) */
  gradient: string;
  /** 价格表(单位:元) */
  price: {
    monthly: number | null;  // null = 不开放月付
    yearly: number | null;   // null = 不开放年付
  };
  /** 卡片强调色(对应当前选中态边框等) */
  accent: string;
  /** 是否显示「立即试用」CTA(Free 专属) */
  showTrialCta: boolean;
  /** 是否显示「首月 ¥18 体验」转化券(Free 专属) */
  showFirstMonthCoupon: boolean;
}

// ===== 4 档会员定义 =====
export const TIER_META: Record<MembershipTier, TierMeta> = {
  free: {
    tier: "free",
    label: "免费版",
    tagline: "1 个宠物 · 10 款药品 · 基础记录",
    emoji: "🐾",
    gradient: "bg-white border border-[var(--color-border)]",
    price: { monthly: 0, yearly: 0 },
    accent: "border-[var(--color-border)]",
    showTrialCta: true,
    showFirstMonthCoupon: false,
  },
  trial: {
    tier: "trial",
    label: "试用版",
    tagline: "3 天全部 Standard 权益 · 到期自动转 Free",
    emoji: "⏳",
    gradient: "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200",
    price: { monthly: 0, yearly: 0 },
    accent: "border-amber-400",
    showTrialCta: false,
    showFirstMonthCoupon: true,  // trial 期间显示「首月 ¥18」转化券
  },
  standard: {
    tier: "standard",
    label: "标准版",
    tagline: "48 款药品 · 课程 · 主题自由切换",
    emoji: "👑",
    gradient: "bg-gradient-vip text-white",
    price: { monthly: 24, yearly: 188 },
    accent: "border-amber-500",
    showTrialCta: false,
    showFirstMonthCoupon: false,
  },
  senior: {
    tier: "senior",
    label: "老年特惠",
    tagline: "强制大字版 · 紧急联系常驻 · 子女可代付",
    emoji: "👴",
    gradient: "bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300",
    price: { monthly: 12, yearly: 118 },
    accent: "border-emerald-500",
    showTrialCta: false,
    showFirstMonthCoupon: false,
  },
};

// ===== 权限矩阵:每档能用什么 =====
export interface TierCapabilities {
  /** AI 问答每日次数限制(0 = 不可用) */
  aiQuestionsPerDay: number;
  /** 药品库可见数量(0 = 10 款公开; -1 = 全部 48 款; 数字 = 前 N 款) */
  drugLibrarySize: number;
  /** 多宠物(>1 只) */
  multiPet: boolean;
  /** 课程(训练) */
  courses: boolean;
  /** 高级打卡(健康 + 遛狗) */
  advancedCheckin: boolean;
  /** AI 宠物角色对话 */
  aiPetTalk: boolean;
  /** 主题切换(免费档也不可用——这是 v0.4.0 商业策略:主题是 premium 体验) */
  themeSwitch: boolean;
  /** 广告位(数字 = 显示的广告位数量;0 = 全部隐藏) */
  adSlots: number;
  /** 紧急联系位(Senior 专属) */
  emergencyContact: boolean;
  /** 续费提醒(到期前 5 天) */
  renewalReminder: boolean;
  /** 主题是否被档位锁定(null = 不锁定;否则 = 锁定的目标主题) */
  themeLocked: ThemeMode | null;  // null = 不锁定, "senior" = 锁定为 senior
}

export const TIER_CAPABILITIES: Record<MembershipTier, TierCapabilities> = {
  free: {
    aiQuestionsPerDay: 5,
    drugLibrarySize: 10,           // 前 10 款公开
    multiPet: false,
    courses: false,
    advancedCheckin: false,
    aiPetTalk: false,
    themeSwitch: false,             // Free 不可切主题
    adSlots: 6,                     // 全开
    emergencyContact: false,
    renewalReminder: false,
    themeLocked: null,
  },
  trial: {
    // 试用 3 天 = 等价 Standard(让用户感受)
    aiQuestionsPerDay: 999,
    drugLibrarySize: -1,            // 全部 48 款
    multiPet: true,
    courses: true,
    advancedCheckin: true,
    aiPetTalk: true,
    themeSwitch: true,              // 试用可切主题
    adSlots: 1,                     // 仅留 1 个低频 banner
    emergencyContact: false,
    renewalReminder: false,
    themeLocked: null,
  },
  standard: {
    aiQuestionsPerDay: 999,
    drugLibrarySize: -1,
    multiPet: true,
    courses: true,
    advancedCheckin: true,
    aiPetTalk: true,
    themeSwitch: true,              // 主题自由切
    adSlots: 1,                     // 减 80%
    emergencyContact: false,
    renewalReminder: true,
    themeLocked: null,
  },
  senior: {
    aiQuestionsPerDay: 999,
    drugLibrarySize: -1,
    multiPet: true,
    courses: true,
    advancedCheckin: true,
    aiPetTalk: true,
    // Senior **强制** senior 主题(隐藏切换入口,不开放切回 young)
    themeSwitch: true,              // 允许调 API(用于保持主题锁定逻辑统一);UI 隐藏入口
    adSlots: 0,                     // 弹窗彻底关
    emergencyContact: true,         // 紧急联系常驻
    renewalReminder: true,
    themeLocked: "senior",          // 锁定为 senior 主题
  },
};

// ===== 试用版特殊逻辑 =====
export const TRIAL_DURATION_DAYS = 3;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

/** 试用状态视图(供 UI 显示) */
export interface TrialView {
  isInTrial: boolean;        // 当前是否在试用期内
  trialStartedAt: string;    // ISO
  trialEndsAt: string;       // ISO
  daysLeft: number;          // 0/1/2/3
  hoursLeft: number;         // 0-23
  totalHoursLeft: number;    // days*24 + hours
  expired: boolean;          // 已过期
  urgent: boolean;           // < 24h 即将到期
  /** 紧迫度配色(green/yellow/red) */
  urgency: "safe" | "warn" | "danger" | "expired";
  /** 文案:>24h / 1-24h / 已到期 */
  bannerText: string;
}

/**
 * 计算试用倒计时视图
 * @param trialStartedAt ISO string(trial 开始时间)
 * @param trialEndsAt    ISO string(trial 结束时间,trialStartedAt + 3d)
 * @param now            Date.now() 毫秒数(便于测试)
 */
export function calcTrialView(
  trialStartedAt: string,
  trialEndsAt: string,
  now: number = Date.now()
): TrialView {
  const start = new Date(trialStartedAt).getTime();
  const end = new Date(trialEndsAt).getTime();

  const totalMs = Math.max(0, end - now);
  const totalHoursLeft = Math.floor(totalMs / (60 * 60 * 1000));
  const daysLeft = Math.floor(totalHoursLeft / 24);
  const hoursLeft = totalHoursLeft % 24;

  const expired = totalMs <= 0;
  const urgent = !expired && totalHoursLeft < 24;
  const isInTrial = !expired;

  let urgency: TrialView["urgency"] = "safe";
  if (expired) urgency = "expired";
  else if (urgent) urgency = "danger";
  else if (totalHoursLeft < 48) urgency = "warn";

  let bannerText: string;
  if (expired) {
    bannerText = "已到期，升级解锁更多";
  } else if (totalHoursLeft > 24) {
    bannerText = `试用剩 ${daysLeft} 天`;
  } else if (totalHoursLeft > 0) {
    bannerText = `试用剩 ${hoursLeft} 小时，今天结束`;
  } else {
    bannerText = "试用即将结束";
  }

  return {
    isInTrial,
    trialStartedAt: new Date(start).toISOString(),
    trialEndsAt: new Date(end).toISOString(),
    daysLeft,
    hoursLeft,
    totalHoursLeft,
    expired,
    urgent,
    urgency,
    bannerText,
  };
}

/** 起始试用 → 返回 { trialStartedAt, trialEndsAt } */
export function newTrialRange(now: number = Date.now()): {
  trialStartedAt: string;
  trialEndsAt: string;
} {
  const start = new Date(now);
  const end = new Date(now + TRIAL_DURATION_MS);
  return {
    trialStartedAt: start.toISOString(),
    trialEndsAt: end.toISOString(),
  };
}

// ===== 档位升级顺序 =====
export const TIER_ORDER: Record<MembershipTier, number> = {
  free: 0,
  trial: 1,
  standard: 2,
  senior: 3,
};

/** 是否可以从 `from` 升级到 `to` */
export function canUpgradeTo(from: MembershipTier, to: MembershipTier): boolean {
  if (from === to) return false;
  return TIER_ORDER[to] > TIER_ORDER[from];
}

// ===== 价格表(供付款页 + 会员卡片用) =====
export interface PriceRow {
  tier: Exclude<MembershipTier, "free" | "trial">;
  monthly: number;
  yearly: number;
  /** 年付相比月付省多少(元) */
  yearlySave: number;
  /** 年付相比月付的折扣百分比(0-100) */
  yearlyDiscountPct: number;
  /** 折后月均价(元) */
  monthlyAvgOnYearly: number;
}

export const PRICE_TABLE: PriceRow[] = [
  {
    tier: "standard",
    monthly: 24,
    yearly: 188,
    yearlySave: 24 * 12 - 188,        // 100
    yearlyDiscountPct: Math.round((1 - 188 / (24 * 12)) * 100),  // 35
    monthlyAvgOnYearly: 188 / 12,     // 15.67
  },
  {
    tier: "senior",
    monthly: 12,
    yearly: 118,
    yearlySave: 12 * 12 - 118,        // 26
    yearlyDiscountPct: Math.round((1 - 118 / (12 * 12)) * 100),  // 18
    monthlyAvgOnYearly: 118 / 12,     // 9.83
  },
];

// ===== 转化券(试用 → standard 7 折) =====
export const TRIAL_COUPON_DISCOUNT = 0.3;  // 7 折 = 减 30%
export const FIRST_MONTH_COUPON_PRICE = 18;  // Free 用户的"首月 ¥18 体验"券

/**
 * 生成转化券码(确定式:基于 trialStartedAt 末 6 位 + trialEndsAt 末 6 位)
 * 保证 trial 期间唯一 + 可重算
 */
export function generateTrialCoupon(trialStartedAt: string, trialEndsAt: string): string {
  const a = trialStartedAt.replace(/[^0-9]/g, "").slice(-4).toUpperCase();
  const b = trialEndsAt.replace(/[^0-9]/g, "").slice(-4).toUpperCase();
  return `TRIAL-${a}-${b}`;
}

// ===== v0.4.0.2 P1-6 — 积分系统规则(每日上限 200,触发去重)=====
//
// 规则(v0.4.0.2 任务清单):
//   - 每日打卡 +10(healthChecks + walkLogs 合并)
//   - 上传照片 +10(records type=photo)
//   - 完成提醒 +5(toggle reminder to active)
//   - 连续 7 天打卡 +200(一次性奖励)
//
// 设计:同一天同一动作只 +1 次,用 dateKey + action 去重(存 localStorage 集合)
export const POINTS_RULES = {
  dailyCheckin: 10,
  uploadPhoto: 10,
  completeReminder: 5,
  weeklyStreakBonus: 200,
  weeklyStreakDays: 7,
  /** 单日积分上限(防止刷分) */
  dailyCap: 200,
} as const;

export type PointsAction = "checkin" | "photo" | "reminder" | "streak7";

/** 触发积分事件(去重 + 累计)—— 返回实际加上的积分(0 = 已触发/超额) */
export function triggerPoints(
  action: PointsAction,
  currentPoints: number,
  alreadyTriggered: Set<string>
): { added: number; newPoints: number; triggered: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${today}:${action}`;
  if (alreadyTriggered.has(key)) {
    return { added: 0, newPoints: currentPoints, triggered: false };
  }
  const amount =
    action === "checkin"
      ? POINTS_RULES.dailyCheckin
      : action === "photo"
        ? POINTS_RULES.uploadPhoto
        : action === "reminder"
          ? POINTS_RULES.completeReminder
          : POINTS_RULES.weeklyStreakBonus;
  // 单日上限校验
  const todayPoints = Array.from(alreadyTriggered)
    .filter((k) => k.startsWith(today + ":"))
    .length; // 简化:每次动作最多 POINTS_RULES.<x> 分
  if (todayPoints * 10 + amount > POINTS_RULES.dailyCap) {
    return { added: 0, newPoints: currentPoints, triggered: false };
  }
  return { added: amount, newPoints: currentPoints + amount, triggered: true };
}

// ===== v0.4.0.2 P1-6 — 装扮商品(MVP 1.0:3 主题色 + 2 背景图)=====
import type { DecorationItem } from "./types";

export const DECORATION_ITEMS: DecorationItem[] = [
  {
    id: "color-default",
    kind: "color",
    value: "default",
    name: "默认橘色",
    emoji: "🐾",
    price: 0,    // 默认免费
    preview: "from-orange-300 to-rose-300",
  },
  {
    id: "color-warm",
    kind: "color",
    value: "warm",
    name: "暖阳红",
    emoji: "🌅",
    price: 100,
    preview: "from-rose-400 to-pink-400",
  },
  {
    id: "color-cool",
    kind: "color",
    value: "cool",
    name: "薄荷青",
    emoji: "🌿",
    price: 100,
    preview: "from-emerald-400 to-teal-400",
  },
  {
    id: "bg-none",
    kind: "bg",
    value: "none",
    name: "无背景",
    emoji: "⬜",
    price: 0,
    preview: "bg-[var(--bg-cream)]",
  },
  {
    id: "bg-paw",
    kind: "bg",
    value: "paw",
    name: "爪印纹理",
    emoji: "🐾",
    price: 80,
    preview: "bg-[radial-gradient(circle,_#f4a261_2px,_transparent_3px)]",
  },
];

