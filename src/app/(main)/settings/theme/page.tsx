"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Lock, Sparkles } from "lucide-react";
import { useAppStore, selectMembershipTier } from "@/lib/store";
import { THEME_META } from "@/lib/theme";
import { TIER_CAPABILITIES } from "@/lib/versions";
import { cn } from "@/lib/utils";
import { pushToast } from "@/components/Toast";
import PageHeader from "@/components/PageHeader";
import type { ThemeMode } from "@/lib/types";

export default function ThemeSettingsPage() {
  const tier = useAppStore(selectMembershipTier);
  const currentTheme = useAppStore((s) => s.membership.theme);
  const setTheme = useAppStore((s) => s.useTheme);
  const [previewMode, setPreviewMode] = useState<ThemeMode | null>(null);

  const caps = TIER_CAPABILITIES[tier];
  const isSenior = tier === "senior";

  // Free 用户不可切(themeSwitch=false);Senior 锁 senior;其他可切
  const canPick = caps.themeSwitch && !isSenior;

  /** 应用主题(同时触发 store.useTheme) */
  function apply(mode: ThemeMode) {
    if (!canPick) return;
    setTheme(mode);
    pushToast({
      kind: "success",
      title: "已切换",
      message: `${THEME_META[mode].label}已启用,刷新或继续浏览即可体验`,
    });
  }

  const displayed = previewMode ?? currentTheme;

  return (
    <div className="space-y-5">
      <PageHeader title="主题切换" back />
      <div className="-mt-2">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-soft)] active:opacity-60"
        >
          <ArrowLeft size={16} />
          返回我的
        </Link>
      </div>

      {/* 当前状态条 */}
      <section className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-4 flex items-center gap-3">
        <span className="text-3xl">{THEME_META[displayed].emoji}</span>
        <div className="flex-1">
          <p className="text-xs text-[var(--color-text-soft)]">当前主题</p>
          <p className="text-base font-bold text-[var(--color-text)] mt-0.5">
            {THEME_META[displayed].label}
          </p>
          <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
            {THEME_META[displayed].tagline}
          </p>
        </div>
      </section>

      {/* 2 张主题卡片 */}
      <section>
        <h3 className="text-base font-bold text-[var(--color-text)] mb-3">选择主题</h3>
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(THEME_META) as ThemeMode[]).map((mode) => {
            const meta = THEME_META[mode];
            const isCurrent = mode === currentTheme;
            const isPreview = mode === previewMode;
            const locked = mode === "young" && isSenior;  // Senior 不能切回 young
            return (
              <button
                key={mode}
                onClick={() => {
                  if (locked) {
                    pushToast({ kind: "info", title: "老年版锁定", message: "Senior 档强制使用老年版" });
                    return;
                  }
                  if (!canPick) {
                    pushToast({ kind: "warning", title: "需升级", message: "主题切换是付费权益,免费用户暂不可用" });
                    return;
                  }
                  apply(mode);
                }}
                onMouseEnter={() => setPreviewMode(mode)}
                onMouseLeave={() => setPreviewMode(null)}
                disabled={locked || !canPick}
                className={cn(
                  "relative rounded-3xl p-5 text-left transition-all border-2",
                  meta.mode === "young"
                    ? "bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50"
                    : "bg-gradient-to-br from-emerald-50 to-teal-50",
                  isCurrent ? "border-[var(--color-primary)] shadow-card" : "border-transparent",
                  (locked || !canPick) && "opacity-60 cursor-not-allowed"
                )}
              >
                {/* 当前徽章 */}
                {isCurrent && (
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--color-primary)] text-white text-[10px] rounded-full font-medium">
                    <Check size={10} />
                    当前
                  </div>
                )}

                {/* 锁定徽章(Senior 切 young) */}
                {locked && (
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-500 text-white text-[10px] rounded-full font-medium">
                    <Lock size={10} />
                    锁定
                  </div>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <span className="text-4xl">{meta.emoji}</span>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-[var(--color-text)]">
                      {meta.label}
                      {isPreview && !isCurrent && (
                        <span className="ml-2 text-[10px] text-[var(--color-primary)] font-normal">
                          (预览)
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-[var(--color-text-soft)] mt-0.5">{meta.tagline}</p>
                  </div>
                </div>

                {/* 关键参数预览 */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
                  <div className="bg-white/60 rounded-lg p-2">
                    <p className="text-[var(--color-text-soft)]">基础字号</p>
                    <p className="font-bold text-[var(--color-text)] text-sm">{meta.baseFontSize}px</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2">
                    <p className="text-[var(--color-text-soft)]">按钮高度</p>
                    <p className="font-bold text-[var(--color-text)] text-sm">{meta.buttonMinHeight}px</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2">
                    <p className="text-[var(--color-text-soft)]">圆角</p>
                    <p className="font-bold text-[var(--color-text)] text-sm">{meta.borderRadius}px</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2">
                    <p className="text-[var(--color-text-soft)]">icon 描边</p>
                    <p className="font-bold text-[var(--color-text)] text-sm">{meta.iconStroke}</p>
                  </div>
                </div>

                {/* 特性列表 */}
                <ul className="space-y-1">
                  {meta.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--color-text)]">
                      <Check size={12} className="text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      {/* 免费用户引导 */}
      {tier === "free" && (
        <section className="rounded-2xl bg-gradient-warm p-4 text-white flex items-center gap-3">
          <Sparkles size={24} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">主题切换是会员专享</p>
            <p className="text-[11px] opacity-90 mt-0.5">
              升级后即可切换青年 / 老年双主题
            </p>
          </div>
          <Link
            href="/membership"
            className="px-4 py-2 bg-white text-[var(--color-primary)] rounded-full text-xs font-bold"
          >
            立即升级
          </Link>
        </section>
      )}

      {/* Senior 锁定说明 */}
      {isSenior && (
        <section className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 flex items-start gap-3">
          <Lock size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold">Senior 档强制使用老年版</p>
            <p className="text-[11px] mt-1 opacity-90">
              老年版为 18px 大字 + 高对比配色,针对老人手指友好;取消会员后可自由切换。
            </p>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-white rounded-2xl shadow-soft p-4 text-xs text-[var(--color-text-soft)] leading-relaxed space-y-2">
        <p className="font-bold text-[var(--color-text)] text-sm">关于主题切换</p>
        <p>· 主题切换是会员专享,免费用户需升级后才能切换</p>
        <p>· 老年版为 18px 大字 + 高对比配色,适合视力较弱的用户</p>
        <p>· 主题切换不会影响你的宠物、记录、提醒等任何数据</p>
        <p>· Senior 档强制使用老年版,如需切回请先取消会员</p>
      </section>
    </div>
  );
}
