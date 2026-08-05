// ===== v0.4.0 · 6 个合作位(PartnerSlot)配置 =====
/**
 * 设计原则(plan §2.5 F-AD-01):
 * - v0.4.0 **只占位**,**不接任何广告 SDK / 第三方脚本 / 真实业务 API**
 * - 6 种 type 各自一个空态 UI(灰色 dashed border + "合作位待接入")
 * - `enabled: false` 默认,运营手动开(后续 v0.4.2 接真实合作方时改成 true)
 * - `memberRequired`: 哪一档会员起开始看到
 * - `tier`: 当前状态(未接入 / 占位 / 已上线)
 *
 * 不在本期范围:
 * - 真实保险产品对接 → v0.4.2
 * - 真实问诊 SDK / 兽医转接 → v0.4.2
 * - 真实电商跳转(买同款)→ v0.4.2
 * - 真实训犬学校合作 → v0.4.2
 * - 真实闪购活动接入 → v0.4.2
 * - 紧急联系(emergency-contact)虽名为 PartnerSlot,但**不是广告位**,
 *   是 senior 主题的功能位,默认 `tier="live"` + `enabled=true`
 */

import type { MembershipTier } from "./types";

/** 6 种合作位类型 */
export type PartnerType =
  | "insurance"        // 主页"我的保险"位
  | "online-consult"   // 药品详情"在线问诊"位
  | "buy-same"         // 食物成分结果"买同款"位
  | "training-school"  // 课程页底"训犬学校"位
  | "emergency-contact"// 老年版"紧急联系"位(注意:不是广告位,是功能位)
  | "flash-sale";      // 弹窗"特价活动"位

/** 单档会员起开始看到 */
export type MemberRequired = MembershipTier;

/** 当前接入状态 */
export type PartnerTier = "unbranded" | "placeholder" | "live";

/** 单个合作位的展示元数据(标题/描述/CTA 文案) */
export interface PartnerMeta {
  /** 列表里展示的标题(空态时显示"合作位待接入") */
  title: string;
  /** 描述(空态时显示"运营可手动开启,接入合作方后展示真实内容") */
  description: string;
  /** CTA 按钮文案(空态时显示"待接入") */
  ctaText: string;
  /** 角标(始终显示"合作位"标识,即使没接入) */
  badge: string;
  /** 主题色(仅 placeholder / live 状态用) */
  accent: "blue" | "green" | "orange" | "red" | "purple";
  /** 推荐布局(调用方仍可显式覆盖) */
  defaultVariant: "card" | "banner" | "modal" | "sidebar";
  /** 该位对应的"图示 emoji"(空态也展示) */
  emoji: string;
}

/** 单个合作位的运行时配置 */
export interface PartnerConfig {
  enabled: boolean;
  memberRequired: MemberRequired;
  tier: PartnerTier;
  meta: PartnerMeta;
}

/** 6 个合作位总配置(只读常量) */
export const PARTNER_CONFIG: Record<PartnerType, PartnerConfig> = {
  // 1. 主页"我的保险"位
  insurance: {
    enabled: false,
    memberRequired: "free",
    tier: "placeholder",
    meta: {
      title: "我的保险",
      description: "宠物医疗险 / 意外险合作位,运营可手动开启后展示真实保险产品",
      ctaText: "待接入",
      badge: "合作位",
      accent: "blue",
      defaultVariant: "card",
      emoji: "🛡️",
    },
  },

  // 2. 药品详情"在线问诊"位
  "online-consult": {
    enabled: false,
    memberRequired: "free",
    tier: "placeholder",
    meta: {
      title: "在线问诊",
      description: "执业兽医在线问诊合作位,接入后用户可一键发起问诊",
      ctaText: "待接入",
      badge: "合作位",
      accent: "green",
      defaultVariant: "banner",
      emoji: "🩺",
    },
  },

  // 3. 食物成分结果"买同款"位
  "buy-same": {
    enabled: false,
    memberRequired: "free",
    tier: "placeholder",
    meta: {
      title: "买同款",
      description: "电商合作位,接入后展示当前食物的购买链接",
      ctaText: "待接入",
      badge: "合作位",
      accent: "orange",
      defaultVariant: "card",
      emoji: "🛒",
    },
  },

  // 4. 课程页底"训犬学校"位
  "training-school": {
    enabled: false,
    memberRequired: "free",
    tier: "placeholder",
    meta: {
      title: "线下训犬学校",
      description: "城市训犬学校合作位,接入后展示附近学校 + 报名入口",
      ctaText: "待接入",
      badge: "合作位",
      accent: "purple",
      defaultVariant: "banner",
      emoji: "🎓",
    },
  },

  // 5. 老年版"紧急联系"位(**不是广告位**,默认 live)
  "emergency-contact": {
    enabled: true,
    memberRequired: "free",
    tier: "live",
    meta: {
      title: "紧急联系",
      description: "附近 24h 宠物医院 / 兽医 / 子女电话(本机本地存储,不上传)",
      ctaText: "查看联系方式",
      badge: "功能位",
      accent: "red",
      defaultVariant: "card",
      emoji: "🆘",
    },
  },

  // 6. 弹窗"特价活动"位
  "flash-sale": {
    enabled: false,
    memberRequired: "free",
    tier: "placeholder",
    meta: {
      title: "限时特价活动",
      description: "运营活动合作位,接入后展示限时限购活动",
      ctaText: "待接入",
      badge: "活动位",
      accent: "orange",
      defaultVariant: "modal",
      emoji: "🎉",
    },
  },
};

/** 当前用户 tier 是否能看这个合作位 */
export function canShowPartner(
  type: PartnerType,
  userTier: MembershipTier,
): boolean {
  const cfg = PARTNER_CONFIG[type];
  if (!cfg.enabled) return false;
  // memberRequired = "free" 表示所有档都看
  if (cfg.memberRequired === "free") return true;
  // 其他档位按版本矩阵能力判断(简单顺序:free < trial < standard < senior)
  const order: MembershipTier[] = ["free", "trial", "standard", "senior"];
  const requiredIdx = order.indexOf(cfg.memberRequired);
  const userIdx = order.indexOf(userTier);
  return userIdx >= requiredIdx;
}

/** 6 种 type 的全量列表(供运营后台/调试 UI 用) */
export const PARTNER_TYPES: PartnerType[] = [
  "insurance",
  "online-consult",
  "buy-same",
  "training-school",
  "emergency-contact",
  "flash-sale",
];
