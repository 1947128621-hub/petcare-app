"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAppStore, selectMembershipTier } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AdConfig, AdSlotType } from "@/lib/types";

// ===== 通用广告渲染 =====
function AdCard({ ad, onClick, compact, onClose }: { ad: AdConfig; onClick?: () => void; compact?: boolean; onClose?: () => void }) {
  return (
    <div
      className={cn(
        "w-full text-left rounded-2xl p-4 relative overflow-hidden transition-transform active:scale-[0.98]",
        ad.bgGradient,
        compact ? "min-h-[80px]" : "min-h-[110px]"
      )}
    >
      <button
        onClick={onClick}
        className="absolute inset-0 w-full h-full"
        aria-label={ad.title}
      />
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
        <div className="px-2 py-0.5 bg-black/20 text-white text-[10px] rounded-full font-medium backdrop-blur-sm">
          {ad.badge}
        </div>
        {onClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
            aria-label="关闭广告"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex items-start gap-3 relative pointer-events-none">
        <div className="text-3xl flex-shrink-0">{ad.emoji}</div>
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-bold text-white leading-tight", compact ? "text-sm" : "text-base")}>
            {ad.title}
          </h3>
          <p className={cn("text-white/90 mt-1 leading-snug", compact ? "text-xs" : "text-sm")}>
            {ad.description}
          </p>
          {!compact && (
            <div className="inline-block mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
              {ad.ctaText} →
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== 横幅广告（首页顶部）=====
export function AdBanner() {
  const ad = useAppStore((s) => s.ads.find((a) => a.type === "banner" && a.active));
  const hiddenUntil = useAppStore((s) => s.bannerAdHiddenUntil);
  const hideBanner = useAppStore((s) => s.hideBannerAd);
  const tier = useAppStore(selectMembershipTier);
  if (!ad) return null;
  // v0.4.0 — Senior 完全免广告;standard trial 减 80%(在调用方控制)
  if (tier === "senior") return null;
  // v0.3.2 — 24h 隐藏期内不显示
  if (hiddenUntil && new Date(hiddenUntil) > new Date()) return null;
  return <AdCard ad={ad} onClose={() => hideBanner(24)} />;
}

// ===== 侧栏广告（详情页右侧，移动端显示在底部）=====
export function AdSidebar() {
  const ad = useAppStore((s) => s.ads.find((a) => a.type === "sidebar" && a.active));
  if (!ad) return null;
  return <AdCard ad={ad} compact />;
}

// ===== 底部广告（内容流末尾）=====
export function AdBottom() {
  const ad = useAppStore((s) => s.ads.find((a) => a.type === "bottom" && a.active));
  if (!ad) return null;
  return <AdCard ad={ad} />;
}

// ===== 弹窗广告（每日最多一次）=====
export function AdPopup() {
  const ad = useAppStore((s) => s.ads.find((a) => a.type === "popup" && a.active));
  const lastShown = useAppStore((s) => s.popupAdLastShown);
  const dismissed = useAppStore((s) => s.adPopupDismissed);
  const dismiss = useAppStore((s) => s.dismissPopupAd);
  const tier = useAppStore(selectMembershipTier);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ad) return;
    if (dismissed) return;
    // v0.4.0 — Senior 完全免弹窗
    if (tier === "senior") return;
    // 同一天已显示过则不弹
    const today = new Date().toDateString();
    if (lastShown && new Date(lastShown).toDateString() === today) return;
    // v0.3.2 — 15s 延迟，给用户充足时间熟悉首页
    const t = setTimeout(() => setVisible(true), 15000);
    return () => clearTimeout(t);
  }, [ad, lastShown, dismissed, tier]);

  // v0.4.0.2.1 修复:外部 store 标记 dismissed 后立即同步本地 visible,确保 X 能叉掉
  useEffect(() => {
    if (dismissed) setVisible(false);
  }, [dismissed]);

  if (!ad || !visible) return null;

  // v0.4.0.2.1 修复:X 按钮 onClick 同时 setVisible(false),确保视觉立即消失
  const handleClose = () => {
    dismiss();
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 animate-fade-up" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-card">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50"
          aria-label="关闭广告"
        >
          <X size={18} />
        </button>
        <div className={cn("p-6 text-center text-white", ad.bgGradient)}>
          <div className="text-6xl mb-2">{ad.emoji}</div>
          <div className="text-[10px] tracking-wider opacity-80 mb-1">{ad.badge}</div>
          <h2 className="text-xl font-bold mb-2">{ad.title}</h2>
          <p className="text-sm opacity-90 mb-4">{ad.description}</p>
          <button
            onClick={handleClose}
            className="w-full py-3 bg-white text-[var(--color-text)] rounded-full font-semibold text-sm shadow-md active:scale-[0.98] transition-transform"
          >
            {ad.ctaText}
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
