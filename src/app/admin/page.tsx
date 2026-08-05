"use client";

// ===== /admin · 主页"概览"(实施员 2 负责)=====
//
// v0.4.0 改造:把 v0.3.2 的 4 tab 运营内容(原 tips/announcements/drugs/ads)迁到
// `/admin/(ops)/tips`、`/admin/(ops)/announcements` 等独立路由;
// 本页只剩"概览 + 4 个 sub-route 入口卡 + 实时预览切档"。
//
// 4 sub-route 入口:
//   /admin/challenge   - challenge 验证页(主入口,直接 URL 也可访问)
//   /admin/emergency   - 应急入口(明文 12345)
//   /admin/versions    - 版本矩阵编辑器(4 档 × 7 字段勾选 UI)
//   /admin/(ops)       - 运营内容(后续 sub-route,本期预留)
//
// 实时预览:admin 切档后,整个 app 立刻以新档视角显示(只 admin 可见)
// - 顶部「预览档」dropdown:free / trial / standard / senior / 真实档(null)

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Grid3x3,
  Tv,
  Eye,
  LogOut,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { selectEffectiveTier } from "@/lib/version-matrix";
import { AdminAuth } from "@/lib/admin-auth";
import { cn, formatDateShort } from "@/lib/utils";
import type { MembershipTier } from "@/lib/types";

const TIER_OPTIONS: { value: MembershipTier; label: string; color: string }[] = [
  { value: "free", label: "Free 免费", color: "bg-[var(--color-text-soft)]" },
  { value: "trial", label: "Trial 试用", color: "bg-[var(--color-warning)]" },
  { value: "standard", label: "Standard 标准", color: "bg-[var(--color-primary)]" },
  { value: "senior", label: "Senior 老年特惠", color: "bg-[var(--color-secondary)]" },
];

export default function AdminOverviewPage() {
  // 真实档 / 预览档
  const realTier = useAppStore(selectEffectiveTier);
  const viewAsTier = useAppStore((s) => s.viewAsTier);
  const setViewAsTier = useAppStore((s) => s.setViewAsTier);
  const versionMatrix = useAppStore((s) => s.versionMatrix);

  // 业务数据(只读统计)
  const tips = useAppStore((s) => s.tips);
  const announcements = useAppStore((s) => s.announcements);
  const drugs = useAppStore((s) => s.drugs);
  const ads = useAppStore((s) => s.ads);
  const pets = useAppStore((s) => s.pets);
  const reminders = useAppStore((s) => s.reminders);
  const membership = useAppStore((s) => s.membership);

  // 登出
  const handleLogout = () => {
    AdminAuth.logout();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const stats = useMemo(
    () => ({
      tips: tips.length,
      announcements: announcements.length,
      drugs: drugs.length,
      vipDrugs: drugs.filter((d) => d.vipOnly).length,
      activeAds: ads.filter((a) => a.active).length,
      totalAds: ads.length,
      pets: pets.length,
      reminders: reminders.length,
    }),
    [tips, announcements, drugs, ads, pets, reminders]
  );

  // 当前预览档 = admin 模拟视角(否则是真实档)
  const currentPreviewTier: MembershipTier = viewAsTier ?? realTier;
  const currentCaps = versionMatrix[currentPreviewTier];
  const isPreviewing = viewAsTier !== null && viewAsTier !== realTier;

  return (
    <div className="min-h-screen bg-[var(--bg-cream)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-cream)]/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-[var(--color-border)]">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-soft active:scale-95"
          aria-label="返回首页"
        >
          <ArrowLeft size={18} className="text-[var(--color-text)]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-[var(--color-text)] truncate">管理员后台</h1>
          <p className="text-[10px] text-[var(--color-text-soft)] truncate">
            v{versionMatrix.version} · 实时预览中
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-soft text-[var(--color-text-soft)] active:scale-95"
          aria-label="登出"
          title="登出管理员"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* 实时预览切档器 */}
      <section className="px-4 py-3 bg-white border-b border-[var(--color-border)]">
        <div className="max-w-[480px] mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-[var(--color-primary)]" />
            <span className="text-xs font-bold text-[var(--color-text)]">
              实时预览切档
            </span>
            {isPreviewing && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white font-medium">
                预览中
              </span>
            )}
          </div>
          <p className="text-[10px] text-[var(--color-text-soft)] mb-2 leading-relaxed">
            切换后整个 app 立刻以新档视角显示(广告 / 主题 / 多宠物等)。仅 admin 可见,不影响真实数据。
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => setViewAsTier(null)}
              className={cn(
                "py-2 rounded-xl text-[11px] font-medium transition-all",
                viewAsTier === null
                  ? "bg-[var(--color-text)] text-white shadow-soft"
                  : "bg-[var(--bg-soft)] text-[var(--color-text-soft)] border border-[var(--color-border)]"
              )}
            >
              真实档
            </button>
            {TIER_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setViewAsTier(t.value)}
                className={cn(
                  "py-2 rounded-xl text-[11px] font-medium transition-all",
                  viewAsTier === t.value
                    ? `${t.color} text-white shadow-soft`
                    : "bg-[var(--bg-soft)] text-[var(--color-text-soft)] border border-[var(--color-border)]"
                )}
                title={`预览为 ${t.label}`}
              >
                {t.value}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px]">
            <span className="text-[var(--color-text-soft)]">当前能力:</span>
            <CapBadge ok={currentCaps.adsEnabled} label="广告" />
            <CapBadge ok={currentCaps.cloudSync} label="云同步" />
            <CapBadge ok={currentCaps.customTheme} label="主题切换" />
            <CapBadge ok={currentCaps.trialEligible} label="试用" />
          </div>
        </div>
      </section>

      {/* 内容区 */}
      <main className="w-full max-w-[480px] mx-auto px-4 py-4 space-y-4">
        {/* 欢迎卡 */}
        <div className="rounded-2xl bg-gradient-warm text-white p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} />
            <h2 className="text-sm font-bold">管理员已登录</h2>
          </div>
          <p className="text-[11px] opacity-90 leading-relaxed">
            当前真实档: <strong>{realTier}</strong>
            {isPreviewing && (
              <span>
                {" · "}预览档: <strong>{viewAsTier}</strong>
              </span>
            )}
          </p>
          <p className="text-[11px] opacity-90 leading-relaxed mt-1">
            主题: {membership.theme} · 积分: {membership.points}
          </p>
        </div>

        {/* 数据统计 */}
        <section>
          <h2 className="text-xs font-bold text-[var(--color-text-soft)] uppercase mb-2 px-1">
            业务数据
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="小贴士" value={stats.tips} color="text-[var(--color-primary)]" />
            <StatCard label="公告" value={stats.announcements} color="text-[var(--color-secondary)]" />
            <StatCard label="药品" value={stats.drugs} color="text-[var(--color-success)]" />
            <StatCard
              label="广告"
              value={`${stats.activeAds}/${stats.totalAds}`}
              color="text-[var(--color-warning)]"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <StatCard label="宠物" value={stats.pets} color="text-[var(--color-primary)]" />
            <StatCard label="提醒" value={stats.reminders} color="text-[var(--color-warning)]" />
            <StatCard label="VIP药" value={stats.vipDrugs} color="text-[var(--color-vip)]" />
          </div>
          <p className="text-[10px] text-[var(--color-text-soft)] text-center mt-1">
            最后更新 {formatDateShort(membership.history.at(-1)?.startedAt ?? new Date().toISOString())}
          </p>
        </section>

        {/* 4 个 sub-route 入口 */}
        <section>
          <h2 className="text-xs font-bold text-[var(--color-text-soft)] uppercase mb-2 px-1">
            管理功能
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <SubRouteCard
              href="/admin/challenge"
              icon={ShieldCheck}
              title="Challenge 入口"
              desc="主入口 · SHA-256 验证"
              color="bg-[var(--color-primary)]"
            />
            <SubRouteCard
              href="/admin/emergency"
              icon={KeyRound}
              title="应急入口"
              desc="12345 · hard-coded backup"
              color="bg-[var(--color-warning)]"
            />
            <SubRouteCard
              href="/admin/versions"
              icon={Grid3x3}
              title="版本矩阵"
              desc="4 档 × 7 字段编辑"
              color="bg-[var(--color-success)]"
            />
            <SubRouteCard
              href="/admin"
              icon={Tv}
              title="运营内容"
              desc="小贴士 / 公告 / 药品 / 广告(开发中)"
              color="bg-[var(--color-text-soft)]"
              disabled
            />
          </div>
        </section>

        {/* 当前能力摘要 */}
        <section>
          <h2 className="text-xs font-bold text-[var(--color-text-soft)] uppercase mb-2 px-1">
            {currentPreviewTier} 档能力摘要
          </h2>
          <div className="bg-white rounded-2xl p-3.5 shadow-soft space-y-1.5">
            <CapRow label="广告" ok={currentCaps.adsEnabled} />
            <CapRow label="导出数据" ok={currentCaps.exportData} />
            <CapRow label="云同步" ok={currentCaps.cloudSync} />
            <CapRow label="多宠物" ok={currentCaps.multiPet} />
            <CapRow label="切换主题" ok={currentCaps.customTheme} />
            <CapRow label="可试用" ok={currentCaps.trialEligible} />
            <CapRow label="OTA 通道" ok text={currentCaps.otaChannel} />
          </div>
        </section>

        {/* 版本矩阵发布时间 */}
        <p className="text-[10px] text-center text-[var(--color-text-soft)] py-2">
          矩阵落盘时间:{formatDateShort(versionMatrix.releasedAt)}
        </p>
      </main>
    </div>
  );
}

// ===== 子组件 =====
function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-2.5 shadow-soft text-center">
      <p className={cn("text-lg font-bold", color)}>{value}</p>
      <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5">{label}</p>
    </div>
  );
}

function SubRouteCard({
  href,
  icon: Icon,
  title,
  desc,
  color,
  disabled,
}: {
  href: string;
  icon: typeof ShieldCheck;
  title: string;
  desc: string;
  color: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white", color)}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-bold text-[var(--color-text)] truncate">{title}</h3>
        <p className="text-[10px] text-[var(--color-text-soft)] truncate mt-0.5">{desc}</p>
      </div>
    </>
  );
  if (disabled) {
    return (
      <div className="bg-white rounded-2xl p-3 shadow-soft flex items-center gap-2.5 opacity-50">
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl p-3 shadow-soft flex items-center gap-2.5 active:scale-[0.98] transition-transform"
    >
      {inner}
    </Link>
  );
}

function CapBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5",
        ok
          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
          : "bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
      )}
    >
      {ok ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
      {label}
    </span>
  );
}

function CapRow({ label, ok, text }: { label: string; ok: boolean; text?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--color-text-soft)]">{label}</span>
      <span
        className={cn(
          "font-medium flex items-center gap-1",
          ok ? "text-[var(--color-success)]" : "text-[var(--color-text-soft)]"
        )}
      >
        {text ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-soft)] font-mono">
            {text}
          </span>
        ) : ok ? (
          <>
            <CheckCircle2 size={11} />
            开启
          </>
        ) : (
          <>
            <Lock size={10} />
            关闭
          </>
        )}
      </span>
    </div>
  );
}
