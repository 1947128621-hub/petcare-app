"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Star, X, Check } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { cn, formatDate, speciesEmoji } from "@/lib/utils";
import type { HealthCheck, HealthCheckType } from "@/lib/types";

// ===== 6 种类型的展示 + 状态选项 =====
type OptionItem = { value: string; label: string; color?: string };

const TYPES: Array<{
  type: HealthCheckType;
  emoji: string;
  color: string;
  soft: string;
  prompt: string;
  options?: OptionItem[];
  withRating?: boolean;
  withCount?: boolean; // 呕吐：次数 chip
}> = [
  {
    type: "便便",
    emoji: "💩",
    color: "#8b6f47",
    soft: "bg-[#8b6f47]/15 text-[#6f5639]",
    prompt: "便便状态",
    options: [
      { value: "正常", label: "正常成形" },
      { value: "软便", label: "软便" },
      { value: "稀便", label: "稀便" },
      { value: "便秘", label: "便秘" },
    ],
  },
  {
    type: "尿尿",
    emoji: "💧",
    color: "#5b9bd5",
    soft: "bg-[#5b9bd5]/15 text-[#3d7bb0]",
    prompt: "尿尿状态",
    options: [
      { value: "正常", label: "正常" },
      { value: "偏黄", label: "偏黄" },
      { value: "血尿", label: "血尿" },
    ],
  },
  {
    type: "呕吐",
    emoji: "🤮",
    color: "#e3a93b",
    soft: "bg-[#e3a93b]/15 text-[#a87718]",
    prompt: "呕吐次数 + 备注",
    withCount: true,
  },
  {
    type: "精神",
    emoji: "😺",
    color: "#6b8afd",
    soft: "bg-[#6b8afd]/15 text-[#4a68d8]",
    prompt: "精神状态",
    withRating: true,
  },
  {
    type: "食欲",
    emoji: "🍽️",
    color: "#ff8c5a",
    soft: "bg-[#ff8c5a]/15 text-[#d96a3a]",
    prompt: "食欲状态",
    withRating: true,
  },
  {
    type: "饮水",
    emoji: "💦",
    color: "#4ec5b8",
    soft: "bg-[#4ec5b8]/15 text-[#2f8a80]",
    prompt: "饮水量",
    withRating: true,
  },
];

export default function HealthCheckinPage() {
  const router = useRouter();
  const pets = useAppStore((s) => s.pets);
  const healthChecks = useAppStore((s) => s.healthChecks);
  const addHealthCheck = useAppStore((s) => s.addHealthCheck);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id || null);
  const [activeType, setActiveType] = useState<HealthCheckType | null>(null);

  const currentPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId),
    [pets, selectedPetId]
  );

  // ===== 今日已打卡（按 type 汇总）=====
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayCounts = useMemo(() => {
    const map: Partial<Record<HealthCheckType, number>> = {};
    healthChecks.forEach((h) => {
      if (currentPet && h.petId !== currentPet.id) return;
      if (new Date(h.createdAt) < todayStart) return;
      map[h.type] = (map[h.type] || 0) + 1;
    });
    return map;
  }, [healthChecks, currentPet, todayStart]);

  const todayList = useMemo(() => {
    return healthChecks
      .filter((h) => currentPet && h.petId === currentPet.id && new Date(h.createdAt) >= todayStart)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [healthChecks, currentPet, todayStart]);

  // ===== 提交 =====
  const handleSubmit = (payload: Omit<HealthCheck, "id" | "createdAt">) => {
    addHealthCheck(payload);
    pushToast({ kind: "success", title: "已记录", message: `${payload.type}打卡成功` });
    setActiveType(null);
    setTimeout(() => router.push("/checkin"), 350);
  };

  if (pets.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="健康打卡" back />
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl shadow-soft">
          <span className="text-5xl mb-2">🐾</span>
          <p className="text-sm text-[var(--color-text)] font-semibold">还没有宠物</p>
          <p className="text-xs text-[var(--color-text-soft)] mt-1">先添加一只宠物再打卡吧</p>
          <Link
            href="/pets/new"
            className="mt-4 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft"
          >
            添加宠物
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-6">
      {/* 自定义返回按钮 */}
      <Link
        href="/checkin"
        aria-label="返回"
        className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
      >
        <ChevronLeft size={20} />
      </Link>

      <PageHeader title="健康打卡" back />

      <div className="mt-2 space-y-4">
        {/* 宠物选择 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {pets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPetId(p.id)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedPetId === p.id
                  ? "bg-[var(--color-primary)] text-white shadow-soft"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              )}
            >
              <span className="mr-1.5">{p.avatar}</span>
              {p.name}
            </button>
          ))}
        </div>

        {/* 6 种类型 grid */}
        <section>
          <h3 className="text-xs font-semibold text-[var(--color-text-soft)] mb-2 px-1">
            选择打卡类型
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {TYPES.map((t) => {
              const count = todayCounts[t.type] || 0;
              return (
                <button
                  key={t.type}
                  onClick={() => setActiveType(t.type)}
                  className="relative bg-white rounded-2xl p-4 shadow-soft active:scale-[0.98] transition-transform text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl", t.soft)}>
                      <span>{t.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[var(--color-text)]">{t.type}</h4>
                      <p className="text-[10px] text-[var(--color-text-soft)] mt-0.5 truncate">
                        {t.withRating ? "1-5 颗星评分" : t.withCount ? "次数 + 备注" : "选择状态"}
                      </p>
                    </div>
                  </div>
                  {count > 0 && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: t.color }}>
                      今日 {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 今日已打卡列表 */}
        {todayList.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-[var(--color-text-soft)] mb-2 px-1">
              今日已打卡
            </h3>
            <div className="bg-white rounded-2xl shadow-soft divide-y divide-[var(--color-border)]">
              {todayList.map((h) => {
                const t = TYPES.find((x) => x.type === h.type)!;
                return (
                  <div key={h.id} className="px-3.5 py-3 flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-base", t.soft)}>
                      <span>{t.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {h.type}
                        {h.rating ? ` ${"⭐".repeat(h.rating)}` : ""}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5 truncate">
                        {h.note || "—"}
                        <span className="ml-2">{formatDate(h.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Modal 弹窗 */}
      {activeType && currentPet && (
        <TypeModal
          type={activeType}
          onClose={() => setActiveType(null)}
          onSubmit={(payload) => handleSubmit(payload)}
          petId={currentPet.id}
        />
      )}

      <AdBottom />
    </div>
  );
}

// ===== 弹窗组件 =====
function TypeModal({
  type,
  onClose,
  onSubmit,
  petId,
}: {
  type: HealthCheckType;
  onClose: () => void;
  onSubmit: (p: Omit<HealthCheck, "id" | "createdAt">) => void;
  petId: string;
}) {
  const t = TYPES.find((x) => x.type === type)!;
  const [option, setOption] = useState<string | null>(null);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [note, setNote] = useState("");

  const canSubmit = t.withRating ? rating !== null : option !== null;

  const handleConfirm = () => {
    if (!canSubmit) return;
    let finalNote = note.trim();
    if (t.withCount && option) {
      finalNote = `${option}次${finalNote ? " · " + finalNote : ""}`;
    } else if (option && !t.withRating) {
      finalNote = finalNote ? `${option} · ${finalNote}` : option;
    }
    onSubmit({
      petId,
      type: t.type,
      rating: t.withRating ? (rating as 1 | 2 | 3 | 4 | 5) : undefined,
      note: finalNote || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-up" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-card animate-fade-up">
        {/* 顶部条 + 关闭 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-xl", t.soft)}>
              <span>{t.emoji}</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)]">{t.type}打卡</h3>
              <p className="text-[11px] text-[var(--color-text-soft)]">{t.prompt}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* 选项 chips（便便 / 尿尿） */}
          {t.options && (
            <div className="grid grid-cols-2 gap-2">
              {t.options.map((o) => {
                const active = option === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setOption(o.value)}
                    className={cn(
                      "py-3 rounded-2xl text-sm font-medium transition-all active:scale-95",
                      active
                        ? "text-white shadow-soft"
                        : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                    )}
                    style={active ? { backgroundColor: t.color } : undefined}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 呕吐：次数 chip */}
          {t.withCount && (
            <div>
              <p className="text-xs text-[var(--color-text-soft)] mb-2">次数</p>
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3+"].map((c) => {
                  const active = option === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setOption(c)}
                      className={cn(
                        "py-3 rounded-2xl text-base font-bold transition-all active:scale-95",
                        active
                          ? "text-white shadow-soft"
                          : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                      )}
                      style={active ? { backgroundColor: t.color } : undefined}
                    >
                      {c} 次
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 评分（精神/食欲/饮水） */}
          {t.withRating && (
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = rating !== null && n <= rating;
                return (
                  <button
                    key={n}
                    onClick={() => setRating(n as 1 | 2 | 3 | 4 | 5)}
                    className="active:scale-95 transition-transform"
                    aria-label={`${n} 星`}
                  >
                    <Star
                      size={36}
                      className={cn(
                        "transition-colors",
                        filled ? "" : "text-[var(--color-border)]"
                      )}
                      fill={filled ? t.color : "none"}
                      stroke={filled ? t.color : "currentColor"}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* 备注 */}
          <div>
            <p className="text-xs text-[var(--color-text-soft)] mb-1.5">备注（可选）</p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                t.withCount ? "如：吐未消化的猫粮" : t.withRating ? "如：很活泼" : "补充说明…"
              }
              maxLength={40}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--bg-soft)] text-sm placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* 提交按钮 */}
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={cn(
              "w-full py-3 rounded-full text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all",
              canSubmit ? "shadow-card active:scale-[0.98]" : "bg-[var(--color-border)] text-[var(--color-text-soft)]"
            )}
            style={canSubmit ? { backgroundColor: t.color } : undefined}
          >
            <Check size={16} /> 完成打卡
          </button>
        </div>
      </div>
    </div>
  );
}
