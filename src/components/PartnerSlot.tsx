// ===== 6 个合作伙伴广告位占位组件(实施员 3 + 整体)=====
//
// 任务来源:实施员 3 · 药品详情页底部加 PartnerSlot(type="online-consult")
// 实施日期:2026-08-04
// 实施依据:
//   - plan §2.5 F-AD-01(6 个广告位占位 — **不接广告**)
//   - implementation §2 #24 + §3 修改文件清单
//   - 整改报告 MUST-02(路径裁决):所有 admin 在 src/app/admin/ 根路径
//
// 6 个位置(plan §2.5 L374-376):
//   1. 主页「我的保险」位          (home 中部卡片)         type="insurance"
//   2. 药品详情「在线问诊」位      (medicine/[id] 底部)   type="online-consult"  ★ 本任务必加
//   3. 食物成分结果「买同款」位    (food/result 底部)     type="buy-same"
//   4. 课程页底「训犬学校」位      (courses/[id] 底部)    type="training-school"
//   5. 老年版「紧急联系」位        (senior 主题 home 顶部) type="emergency-contact"
//   6. 弹窗「特价活动」位          (运营弹窗,默认 active) type="special-offer"
//
// 严格约束(任务清单):
//   - ❌ 不接广告 SDK — 仅占位,虚线卡片 / 虚线 banner / 弹窗
//   - ❌ 不藏药(无关)
//   - ❌ 桌面不建文件
//   - ✅ 6 个 type 全部导出(其他实施员/后续可挂载;本任务只挂 #2 "online-consult")
//
// 既有调用方(default export):
//   - app/(main)/page.tsx:        <PartnerSlot type="insurance" />                    卡片
//                                <PartnerSlot type="special-offer" variant="banner" /> 横幅
//   - components/AppShell.tsx:    <PartnerSlot type="special-offer" variant="modal" />  弹窗
//   - app/(main)/settings/emergency/page.tsx: <PartnerSlot type="emergency-contact" />
//   - app/(main)/courses/[id]/ClientView.tsx: <PartnerSlot type="training-school" />
//   - app/(main)/food/[id]/ClientView.tsx:    <PartnerSlot type="buy-same" />
//   - app/(main)/medicine/[id]/ClientView.tsx: <PartnerSlot type="online-consult" />  ★ 本任务
//
// 设计:
//   - default export(既有调用方期望)
//   - 3 种 variant:无 = inline card;banner = 横幅;modal = 弹窗
//   - type union 6 个
//   - 不依赖 store / 会员档(纯静态占位;v0.4.0 简陋版不接 tier 分流)

"use client";

import { useEffect, useState } from "react";
import { Phone, Stethoscope, ShoppingBag, GraduationCap, ShieldAlert, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PARTNER_MODAL_DISMISS_KEY = "petcare-partner-modal-dismissed-v1";
const PARTNER_MODAL_DELAY_MS = 10000; // v0.4.0.2.1 — 启动 10s 后才弹,避免阻挡首屏渲染

export type PartnerSlotType =
  | "insurance"
  | "online-consult"
  | "buy-same"
  | "training-school"
  | "emergency-contact"
  | "special-offer";

export type PartnerSlotVariant = "banner" | "modal" | undefined;

interface PartnerSlotMeta {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  emoji: string;
  title: string;
  description: string;
  ctaText: string;
  bgClass: string;
  iconColor: string;
  /** 真实接广告时运营/产品需要的位置 ID(占位用) */
  placementId: string;
}

const PARTNER_META: Record<PartnerSlotType, PartnerSlotMeta> = {
  insurance: {
    icon: ShieldAlert,
    emoji: "🛡️",
    title: "宠物保险 · 月付 ¥19.9",
    description: "意外医疗最高赔付 80% · 全国定点医院直付",
    ctaText: "了解详情",
    bgClass: "bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200",
    iconColor: "text-amber-600",
    placementId: "home_insurance_card",
  },
  "online-consult": {
    icon: Stethoscope,
    emoji: "👨‍⚕️",
    title: "在线问诊 · 三甲兽医 7×24",
    description: "首单 1 元 · 平均 5 分钟接诊 · 用药指导 / 行为咨询",
    ctaText: "立即咨询",
    bgClass: "bg-gradient-to-br from-sky-50 to-blue-100 border-sky-200",
    iconColor: "text-sky-600",
    placementId: "medicine_detail_online_consult",
  },
  "buy-same": {
    icon: ShoppingBag,
    emoji: "🛒",
    title: "买同款 · 处方粮 / 营养品",
    description: "同款同批次 · 当日发货 · 假一赔十",
    ctaText: "去看看",
    bgClass: "bg-gradient-to-br from-pink-50 to-rose-100 border-rose-200",
    iconColor: "text-rose-600",
    placementId: "food_result_buy_same",
  },
  "training-school": {
    icon: GraduationCap,
    emoji: "🎓",
    title: "训犬学校 · 一对一上门",
    description: "CKU 认证教练 · 行为矫正 / 基础服从 / 社交训练",
    ctaText: "免费试听",
    bgClass: "bg-gradient-to-br from-purple-50 to-violet-100 border-violet-200",
    iconColor: "text-violet-600",
    placementId: "course_detail_training_school",
  },
  "emergency-contact": {
    icon: Phone,
    emoji: "📞",
    title: "紧急联系 · 24h 宠物医院",
    description: "一键拨打最近医院 · 导航直达 · 老人友好大按钮",
    ctaText: "立即拨打",
    bgClass: "bg-gradient-to-br from-red-50 to-rose-100 border-red-300",
    iconColor: "text-red-600",
    placementId: "senior_home_emergency_contact",
  },
  "special-offer": {
    icon: Tag,
    emoji: "🎁",
    title: "限时特价 · 运营活动",
    description: "限时优惠 · 全场满减 · 错过等一年",
    ctaText: "立即抢购",
    bgClass: "bg-gradient-to-br from-fuchsia-500 to-pink-600",
    iconColor: "text-white",
    placementId: "global_popup_flash_sale",
  },
};

interface PartnerSlotProps {
  type: PartnerSlotType;
  /** 渲染变体:无 = inline card;banner = 横幅;modal = 弹窗 */
  variant?: PartnerSlotVariant;
  /** 是否展示(默认 true) */
  active?: boolean;
  /** 自定义 className */
  className?: string;
  /** CTA 点击回调(占位期 no-op;真实接广告时挂 onClick) */
  onCtaClick?: () => void;
}

// ===== inline 卡片(无 variant 或 variant=undefined)=====
function InlineCard({ meta, onCtaClick, className }: { meta: PartnerSlotMeta; onCtaClick?: () => void; className?: string }) {
  const Icon = meta.icon;
  return (
    <div
      data-partner-slot={meta.placementId}
      data-placement-id={meta.placementId}
      className={cn(
        "rounded-2xl border-2 border-dashed p-4 flex items-center gap-3 transition-transform active:scale-[0.98]",
        meta.bgClass,
        className
      )}
    >
      <div className={cn("w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0", meta.iconColor)}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-base">{meta.emoji}</span>
          <h4 className="text-sm font-bold text-[var(--color-text)] truncate">{meta.title}</h4>
        </div>
        <p className="text-[11px] text-[var(--color-text-soft)] leading-snug line-clamp-2">
          {meta.description}
        </p>
      </div>
      <button
        type="button"
        onClick={onCtaClick}
        className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-semibold transition-colors bg-white/80 hover:bg-white text-[var(--color-text)] shadow-sm"
        aria-label={meta.ctaText}
      >
        {meta.ctaText}
      </button>
    </div>
  );
}

// ===== 横幅(variant="banner")=====
function BannerSlot({ meta, onCtaClick, className }: { meta: PartnerSlotMeta; onCtaClick?: () => void; className?: string }) {
  const Icon = meta.icon;
  return (
    <div
      data-partner-slot={meta.placementId}
      data-placement-id={meta.placementId}
      className={cn(
        "rounded-2xl p-4 text-white flex items-center gap-3 shadow-card border-2 border-dashed border-white/40",
        meta.bgClass,
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <Icon size={24} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-base">{meta.emoji}</span>
          <h4 className="text-sm font-bold truncate">{meta.title}</h4>
        </div>
        <p className="text-[11px] opacity-95 leading-snug line-clamp-2">
          {meta.description}
        </p>
      </div>
      <button
        type="button"
        onClick={onCtaClick}
        className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-colors bg-white text-pink-600 shadow-sm hover:bg-pink-50"
        aria-label={meta.ctaText}
      >
        {meta.ctaText} →
      </button>
    </div>
  );
}

// ===== 弹窗(variant="modal")=====
function ModalSlot({ meta, onCtaClick, className }: { meta: PartnerSlotMeta; onCtaClick?: () => void; className?: string }) {
  // v0.4.0.2.1 修复:改为 false 起步,useEffect 读 localStorage + 延迟弹出 + 持久化关闭
  // 原因:之前 useState(true) 启动即弹,在 Tauri WebView 上叠加 PrivacyConsentModal 导致黑屏
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // 当日已关闭过则不再弹
      const dismissed = localStorage.getItem(PARTNER_MODAL_DISMISS_KEY);
      const today = new Date().toDateString();
      if (dismissed === today) return;
    } catch {
      /* ignore */
    }
    // 启动 N 秒后才弹,避免首屏 hydration 期间挡住
    const t = setTimeout(() => setVisible(true), PARTNER_MODAL_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;
  const Icon = meta.icon;

  const handleCta = () => {
    onCtaClick?.();
    handleClose();
  };
  const handleClose = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PARTNER_MODAL_DISMISS_KEY, new Date().toDateString());
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div
      data-partner-slot={meta.placementId}
      data-placement-id={meta.placementId}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center px-6 animate-fade-up",
        className
      )}
    >
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className={cn("relative w-full max-w-sm rounded-3xl overflow-hidden shadow-card text-white", meta.bgClass)}>
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50"
          aria-label="关闭"
        >
          <X size={18} />
        </button>
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 flex items-center justify-center">
            <Icon size={32} className="text-white" />
          </div>
          <div className="text-3xl mb-2">{meta.emoji}</div>
          <h2 className="text-xl font-bold mb-2">{meta.title}</h2>
          <p className="text-sm opacity-95 mb-5">{meta.description}</p>
          <button
            onClick={handleCta}
            className="w-full py-3 bg-white text-pink-600 rounded-full font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
          >
            {meta.ctaText}
          </button>
          <button
            onClick={handleClose}
            className="mt-3 w-full py-2.5 text-sm text-white font-medium bg-white/15 hover:bg-white/25 rounded-full backdrop-blur-sm transition-colors"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 合作伙伴广告位占位
 *
 * v0.4.0 简陋版:仅占位,不接广告 SDK。
 * 后续接广告时,读取 meta[type] 的 placementId,运营/广告平台返回 creative 后填入。
 */
export default function PartnerSlot({ type, variant, active = true, className, onCtaClick }: PartnerSlotProps) {
  if (!active) return null;
  const meta = PARTNER_META[type];

  if (variant === "modal") {
    return <ModalSlot meta={meta} onCtaClick={onCtaClick} className={className} />;
  }
  if (variant === "banner") {
    return <BannerSlot meta={meta} onCtaClick={onCtaClick} className={className} />;
  }
  return <InlineCard meta={meta} onCtaClick={onCtaClick} className={className} />;
}

// 同时提供命名导出,方便本任务 medicine/[id]/ClientView.tsx 用
export { PartnerSlot };
