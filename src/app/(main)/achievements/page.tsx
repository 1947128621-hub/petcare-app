"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Sparkles, X, Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import type { Achievement } from "@/lib/types";

type Rarity = "common" | "rare" | "epic" | "legendary";

// ===== 稀有度配色 =====
const RARITY_META: Record<
  Rarity,
  { label: string; bar: string; chip: string; cardBg: string; emojiBg: string; barTrack: string }
> = {
  common: {
    label: "普通",
    bar: "bg-slate-400",
    chip: "bg-slate-100 text-slate-600",
    cardBg: "bg-white border border-[var(--color-border)]",
    emojiBg: "bg-slate-100",
    barTrack: "bg-slate-100",
  },
  rare: {
    label: "稀有",
    bar: "bg-blue-500",
    chip: "bg-blue-50 text-blue-600",
    cardBg:
      "bg-gradient-to-br from-blue-50 to-white border border-blue-200",
    emojiBg: "bg-blue-100",
    barTrack: "bg-blue-50",
  },
  epic: {
    label: "史诗",
    bar: "bg-purple-500",
    chip: "bg-purple-50 text-purple-600",
    cardBg:
      "bg-gradient-to-br from-purple-50 to-white border border-purple-200",
    emojiBg: "bg-purple-100",
    barTrack: "bg-purple-50",
  },
  legendary: {
    label: "传说",
    bar: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700",
    cardBg:
      "bg-gradient-to-br from-amber-50 via-orange-50 to-white border border-amber-300",
    emojiBg: "bg-amber-100",
    barTrack: "bg-amber-50",
  },
};

const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];

export default function AchievementsPage() {
  const achievements = useAppStore((s) => s.achievements);
  const unlocks = useAppStore((s) => s.achievementUnlocks);
  const checkAndUnlock = useAppStore((s) => s.checkAndUnlockAchievements);

  // mount 时检查一次新解锁
  useEffect(() => {
    const newIds = checkAndUnlock();
    if (newIds.length > 0) {
      // 排队显示，第一个用 modal，其余用 toast
      const [first, ...rest] = newIds;
      const firstA = achievements.find((a) => a.id === first);
      if (firstA) {
        setActiveModal({
          achievement: firstA,
          isNew: true,
        });
      }
      rest.forEach((id) => {
        const a = achievements.find((x) => x.id === id);
        if (a) {
          pushToast({ kind: "success", title: `🎉 成就解锁：${a.title}`, message: a.description });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 解锁时间索引
  const unlockMap = useMemo(() => {
    const m: Record<string, string> = {};
    unlocks.forEach((u) => {
      m[u.achievementId] = u.unlockedAt;
    });
    return m;
  }, [unlocks]);

  // 标记最近 3 个为 NEW（按解锁时间倒序取前 3）
  const newSet = useMemo(() => {
    const sorted = [...unlocks]
      .filter((u) => unlockMap[u.achievementId])
      .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
      .slice(0, 3);
    return new Set(sorted.map((u) => u.achievementId));
  }, [unlocks, unlockMap]);

  // 总进度 + 分类进度
  const stats = useMemo(() => {
    const total = achievements.length;
    const unlockedCount = unlocks.length;
    const byRarity: Record<Rarity, { total: number; unlocked: number }> = {
      common: { total: 0, unlocked: 0 },
      rare: { total: 0, unlocked: 0 },
      epic: { total: 0, unlocked: 0 },
      legendary: { total: 0, unlocked: 0 },
    };
    achievements.forEach((a) => {
      byRarity[a.rarity].total += 1;
      if (unlockMap[a.id]) byRarity[a.rarity].unlocked += 1;
    });
    return { total, unlockedCount, byRarity };
  }, [achievements, unlocks, unlockMap]);

  // 模态控制
  const [activeModal, setActiveModal] = useState<{
    achievement: Achievement;
    isNew: boolean;
  } | null>(null);

  const onCardClick = (a: Achievement) => {
    setActiveModal({ achievement: a, isNew: false });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="成就墙" subtitle="每一份用心，都有勋章" />

      {/* 顶部统计 */}
      <section className="bg-white rounded-3xl p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-soft)]">已解锁</p>
            <p className="text-2xl font-extrabold text-[var(--color-text)] mt-0.5">
              {stats.unlockedCount}
              <span className="text-base font-semibold text-[var(--color-text-soft)]">
                {" "}/ {stats.total}
              </span>
            </p>
          </div>
          <div className="text-5xl">{stats.unlockedCount === stats.total ? "👑" : "🏅"}</div>
        </div>

        {/* 4 个分类 chip */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {RARITY_ORDER.map((r) => {
            const meta = RARITY_META[r];
            const rStats = stats.byRarity[r];
            return (
              <div
                key={r}
                className={cn("rounded-2xl py-2 px-1 text-center", meta.chip)}
              >
                <div className="text-base font-extrabold">
                  {rStats.unlocked}
                  <span className="text-[10px] font-semibold opacity-70">/{rStats.total}</span>
                </div>
                <div className="text-[10px] mt-0.5">{meta.label}</div>
              </div>
            );
          })}
        </div>

        {/* 4 个进度条 */}
        <div className="mt-3 space-y-1.5">
          {RARITY_ORDER.map((r) => {
            const meta = RARITY_META[r];
            const rStats = stats.byRarity[r];
            const pct = rStats.total > 0 ? (rStats.unlocked / rStats.total) * 100 : 0;
            return (
              <div key={r} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-text-soft)] w-10 shrink-0">
                  {meta.label}
                </span>
                <div className={cn("flex-1 h-1.5 rounded-full overflow-hidden", meta.barTrack)}>
                  <div
                    className={cn("h-full rounded-full transition-all", meta.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--color-text-soft)] tabular-nums w-8 text-right">
                  {Math.round(pct)}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 12 卡 grid */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">所有成就</h3>
          <span className="text-[10px] text-[var(--color-text-soft)]">
            点击卡片查看详情
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {achievements.map((a) => {
            const unlocked = !!unlockMap[a.id];
            const isNew = newSet.has(a.id);
            const meta = RARITY_META[a.rarity];
            return (
              <button
                key={a.id}
                onClick={() => onCardClick(a)}
                className={cn(
                  "relative rounded-2xl p-2.5 flex flex-col items-center text-center transition-transform active:scale-95",
                  unlocked ? meta.cardBg : "bg-[var(--bg-soft)] border border-[var(--color-border)]"
                )}
              >
                {/* NEW 红点 */}
                {isNew && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-[var(--color-danger)] text-white text-[9px] font-bold shadow-soft">
                    NEW
                  </span>
                )}

                {/* emoji / 锁图标 */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-1.5",
                    unlocked ? meta.emojiBg : "bg-white/60"
                  )}
                >
                  {unlocked ? a.emoji : <Lock size={18} className="text-[var(--color-text-soft)]" />}
                </div>

                {/* 标题 */}
                <p
                  className={cn(
                    "text-xs font-bold leading-tight line-clamp-1",
                    unlocked ? "text-[var(--color-text)]" : "text-[var(--color-text-soft)]"
                  )}
                >
                  {a.title}
                </p>

                {/* 描述（未解锁显示条件，已解锁显示解锁时间） */}
                <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5 line-clamp-2 leading-tight min-h-[24px]">
                  {unlocked ? `已解锁 · ${formatDate(unlockMap[a.id])}` : a.description}
                </p>

                {/* 稀有度角标 */}
                <span
                  className={cn(
                    "mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold",
                    unlocked ? meta.chip : "bg-white text-[var(--color-text-soft)]"
                  )}
                >
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 成就 modal（点击 / 新解锁） */}
      {activeModal && (
        <AchievementModal
          achievement={activeModal.achievement}
          isNew={activeModal.isNew}
          unlockedAt={unlockMap[activeModal.achievement.id]}
          onClose={() => setActiveModal(null)}
        />
      )}

      <AdBottom />
    </div>
  );
}

// ===== 成就详情 modal =====
function AchievementModal({
  achievement: a,
  isNew,
  unlockedAt,
  onClose,
}: {
  achievement: Achievement;
  isNew: boolean;
  unlockedAt: string | undefined;
  onClose: () => void;
}) {
  const meta = RARITY_META[a.rarity];
  const unlocked = !!unlockedAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 animate-fade-up">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div
        className={cn(
          "relative w-full max-w-sm rounded-3xl overflow-hidden shadow-card",
          unlocked ? meta.cardBg : "bg-white"
        )}
      >
        {/* 顶部 hero */}
        <div
          className={cn(
            "relative px-6 pt-7 pb-5 text-center",
            unlocked ? meta.cardBg : "bg-[var(--bg-soft)]"
          )}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 text-[var(--color-text)] hover:bg-black/20"
            aria-label="关闭"
          >
            <X size={16} />
          </button>

          {isNew && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold mb-2 shadow-soft">
              <Sparkles size={12} /> 成就解锁
            </div>
          )}

          <div
            className={cn(
              "mx-auto w-24 h-24 rounded-3xl flex items-center justify-center text-6xl shadow-soft",
              unlocked ? meta.emojiBg : "bg-white"
            )}
          >
            {unlocked ? a.emoji : <Lock size={36} className="text-[var(--color-text-soft)]" />}
          </div>

          <h2 className="mt-3 text-xl font-extrabold text-[var(--color-text)]">
            {a.title}
          </h2>
          <span
            className={cn(
              "inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              unlocked ? meta.chip : "bg-white text-[var(--color-text-soft)]"
            )}
          >
            {meta.label} · {a.category}
          </span>
        </div>

        {/* 描述区 */}
        <div className="px-6 py-5 bg-white">
          <p className="text-sm text-[var(--color-text)] leading-relaxed text-center">
            {a.description}
          </p>

          {unlocked ? (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-soft)]">
              <Trophy size={14} className="text-[var(--color-warning)]" />
              <span>解锁于 {formatDate(unlockedAt!)}</span>
            </div>
          ) : (
            <div className="mt-4 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)] text-xs">
                🔒 尚未解锁
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-5 w-full py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            {isNew ? "太棒了！" : "知道了"}
          </button>
        </div>
      </div>
    </div>
  );
}
