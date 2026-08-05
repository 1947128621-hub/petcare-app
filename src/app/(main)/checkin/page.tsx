"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Stethoscope, Footprints, Flame, Trash2, ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useConfirm } from "@/components/useConfirm";
import { useAppStore } from "@/lib/store";
import { cn, formatDate, speciesEmoji } from "@/lib/utils";
import type { HealthCheck, HealthCheckType, WalkLog } from "@/lib/types";

// ===== 6 种健康类型 + 遛狗 =====
const HEALTH_STYLE: Record<
  HealthCheckType,
  { emoji: string; color: string; soft: string; label: string }
> = {
  便便: { emoji: "💩", color: "#8b6f47", soft: "bg-[#8b6f47]/15 text-[#6f5639]", label: "便便" },
  尿尿: { emoji: "💧", color: "#5b9bd5", soft: "bg-[#5b9bd5]/15 text-[#3d7bb0]", label: "尿尿" },
  呕吐: { emoji: "🤮", color: "#e3a93b", soft: "bg-[#e3a93b]/15 text-[#a87718]", label: "呕吐" },
  精神: { emoji: "😺", color: "#6b8afd", soft: "bg-[#6b8afd]/15 text-[#4a68d8]", label: "精神" },
  食欲: { emoji: "🍽️", color: "#ff8c5a", soft: "bg-[#ff8c5a]/15 text-[#d96a3a]", label: "食欲" },
  饮水: { emoji: "💦", color: "#4ec5b8", soft: "bg-[#4ec5b8]/15 text-[#2f8a80]", label: "饮水" },
};

const WALK_STYLE = {
  emoji: "🐕",
  color: "#8bc891",
  label: "遛狗",
};

// ===== 时间线节点类型（合并 health + walk）=====
type TimelineItem =
  | { kind: "health"; data: HealthCheck }
  | { kind: "walk"; data: WalkLog };

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ===== 连续打卡天数 =====
function calcStreak(allDates: Set<string>): number {
  if (allDates.size === 0) return 0;
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  // 今天没打卡就不算连续
  if (!allDates.has(dateKey(cur))) return 0;
  let streak = 0;
  while (allDates.has(dateKey(cur))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function TimelineIcon({ item }: { item: TimelineItem }) {
  if (item.kind === "walk") {
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${WALK_STYLE.color}1f` }}
      >
        <Footprints size={18} style={{ color: WALK_STYLE.color }} />
      </div>
    );
  }
  const s = HEALTH_STYLE[item.data.type];
  return (
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg", s.soft)}>
      <span>{s.emoji}</span>
    </div>
  );
}

export default function CheckinPage() {
  const pets = useAppStore((s) => s.pets);
  const healthChecks = useAppStore((s) => s.healthChecks);
  const walkLogs = useAppStore((s) => s.walkLogs);
  const deleteHealthCheck = useAppStore((s) => s.deleteHealthCheck);
  const deleteWalkLog = useAppStore((s) => s.deleteWalkLog);
  const confirm = useConfirm();

  const [selectedPetId, setSelectedPetId] = useState<string | "all">("all");

  // ===== 今日数据 =====
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isToday = (iso: string) => new Date(iso) >= todayStart;

  const filteredHealth = useMemo(
    () => (selectedPetId === "all" ? healthChecks : healthChecks.filter((h) => h.petId === selectedPetId)),
    [healthChecks, selectedPetId]
  );
  const filteredWalk = useMemo(
    () => (selectedPetId === "all" ? walkLogs : walkLogs.filter((w) => w.petId === selectedPetId)),
    [walkLogs, selectedPetId]
  );

  const todayHealth = useMemo(() => filteredHealth.filter((h) => isToday(h.createdAt)), [filteredHealth]);
  const todayWalk = useMemo(() => filteredWalk.filter((w) => isToday(w.createdAt)), [filteredWalk]);

  const todayPoop = todayHealth.filter((h) => h.type === "便便").length;
  const todayPee = todayHealth.filter((h) => h.type === "尿尿").length;
  const todayVomit = todayHealth.filter((h) => h.type === "呕吐").length;
  const todayWalkMin = todayWalk.reduce((sum, w) => sum + w.durationMin, 0);

  const todayTotal = todayHealth.length + todayWalk.length;

  // ===== 连续打卡 =====
  const streak = useMemo(() => {
    const dateSet = new Set<string>();
    [...healthChecks, ...walkLogs].forEach((x) => {
      dateSet.add(dateKey(new Date(x.createdAt)));
    });
    return calcStreak(dateSet);
  }, [healthChecks, walkLogs]);

  // ===== 时间线（最多 10 条）=====
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...healthChecks.map<TimelineItem>((h) => ({ kind: "health", data: h })),
      ...walkLogs.map<TimelineItem>((w) => ({ kind: "walk", data: w })),
    ];
    items.sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());
    return items.slice(0, 10);
  }, [healthChecks, walkLogs]);

  const petName = (id: string) => pets.find((p) => p.id === id);
  const petEmoji = (id: string) => petName(id)?.avatar || speciesEmoji("other");

  const handleDelete = async (item: TimelineItem) => {
    const ok = await confirm({ title: "删除打卡记录", description: "此操作不可恢复。", variant: "danger", confirmText: "删除" });
    if (!ok) return;
    if (item.kind === "health") {
      deleteHealthCheck(item.data.id);
    } else {
      deleteWalkLog(item.data.id);
    }
    pushToast({ kind: "success", title: "已删除" });
  };

  // 长按 + 右键 删除（返回 id 和事件 handler）
  const itemHandlers = (item: TimelineItem) => {
    const id = `${item.kind}_${item.data.id}`;
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    const start = () => {
      pressTimer = setTimeout(() => handleDelete(item), 600);
    };
    const clear = () => {
      if (pressTimer) clearTimeout(pressTimer);
    };
    return {
      id,
      eventProps: {
        onTouchStart: start,
        onTouchEnd: clear,
        onTouchMove: clear,
        onTouchCancel: clear,
        onMouseDown: start,
        onMouseUp: clear,
        onMouseLeave: clear,
        onContextMenu: (e: React.MouseEvent) => {
          e.preventDefault();
          handleDelete(item);
        },
      },
    };
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="每日打卡"
        subtitle="健康数据，每一天都算数"
        right={
          streak > 0 ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-warm text-white text-xs font-bold shadow-soft">
              <Flame size={12} /> 连续 {streak} 天
            </span>
          ) : undefined
        }
      />

      {/* 宠物选择 */}
      {pets.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          <button
            onClick={() => setSelectedPetId("all")}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              selectedPetId === "all"
                ? "bg-[var(--color-primary)] text-white shadow-soft"
                : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
            )}
          >
            🐾 全部
          </button>
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
      ) : (
        <Link
          href="/pets/new"
          className="block p-5 rounded-3xl bg-gradient-warm text-white shadow-card text-center"
        >
          <div className="text-4xl mb-1">🐾</div>
          <h3 className="text-base font-bold">添加你的第一只宠物</h3>
          <p className="text-xs opacity-90 mt-1">开始为它打卡吧</p>
        </Link>
      )}

      {/* 今日打卡汇总 */}
      <section className="bg-white rounded-3xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--color-text)]">今日打卡</h3>
          {todayTotal === 0 ? (
            <span className="text-[11px] text-[var(--color-text-soft)]">今日还未打卡</span>
          ) : (
            <span className="text-[11px] text-[var(--color-primary)] font-semibold">
              共 {todayTotal} 条
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatCell
            label="便便"
            value={todayPoop}
            unit="次"
            color={HEALTH_STYLE.便便.color}
            empty={todayPoop === 0}
          />
          <StatCell
            label="尿尿"
            value={todayPee}
            unit="次"
            color={HEALTH_STYLE.尿尿.color}
            empty={todayPee === 0}
          />
          <StatCell
            label="呕吐"
            value={todayVomit}
            unit="次"
            color={HEALTH_STYLE.呕吐.color}
            empty={todayVomit === 0}
          />
          <StatCell
            label="遛狗"
            value={todayWalkMin}
            unit="分钟"
            color={WALK_STYLE.color}
            empty={todayWalkMin === 0}
          />
        </div>
      </section>

      {/* 快捷打卡 */}
      <section className="grid grid-cols-3 gap-3">
        <QuickAction
          href="/checkin/health"
          emoji="💩"
          label="健康打卡"
          sub="便便 · 精神 · 食欲"
          gradient="bg-gradient-warm"
        />
        <QuickAction
          href="/checkin/walk"
          emoji="🐕"
          label="遛狗打卡"
          sub="时长 · 距离 · 备注"
          gradient="bg-[#8bc891]"
        />
        <QuickAction
          href="/checkin/history"
          emoji="📊"
          label="打卡历史"
          sub="查看所有记录"
          gradient="bg-[#5b9bd5]"
        />
      </section>

      {/* 最近打卡时间线 */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">最近打卡</h3>
          <Link
            href="/checkin/history"
            className="text-[11px] text-[var(--color-primary)] flex items-center gap-0.5"
          >
            查看全部 <ChevronRight size={12} />
          </Link>
        </div>

        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl shadow-soft">
            <Stethoscope size={32} className="text-[var(--color-text-soft)] mb-2" />
            <p className="text-sm text-[var(--color-text)] font-semibold">还没有打卡记录</p>
            <p className="text-xs text-[var(--color-text-soft)] mt-1">
              从「健康打卡」或「遛狗打卡」开始记录吧
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {timeline.map((item) => {
              const h = itemHandlers(item);
              const p = petName(item.data.petId);
              const isHealth = item.kind === "health";
              const hc = isHealth ? (item.data as HealthCheck) : null;
              return (
                <div
                  key={h.id}
                  {...h.eventProps}
                  className="bg-white rounded-2xl p-3.5 flex items-start gap-3 shadow-soft select-none"
                >
                  <TimelineIcon item={item} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">
                        {isHealth ? hc!.type : "遛狗"}
                      </h4>
                      <span className="text-[10px] text-[var(--color-text-soft)]">
                        {petEmoji(item.data.petId)} {p?.name || "未知"}
                      </span>
                    </div>
                    {isHealth ? (
                      <p className="text-xs text-[var(--color-text-soft)] mt-0.5">
                        {hc!.type}
                        {hc!.rating ? ` · ${"⭐".repeat(hc!.rating)}` : ""}
                        {hc!.note ? ` · ${hc!.note}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--color-text-soft)] mt-0.5">
                        遛狗 {(item.data as WalkLog).durationMin} 分钟
                        {(item.data as WalkLog).distanceKm
                          ? ` · ${(item.data as WalkLog).distanceKm} km`
                          : ""}
                        {(item.data as WalkLog).note
                          ? ` · ${(item.data as WalkLog).note}`
                          : ""}
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--color-text-soft)] mt-1">
                      {formatDate(item.data.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-text-soft)] hover:text-[var(--color-danger)] active:scale-95"
                    aria-label="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            <p className="text-[10px] text-[var(--color-text-soft)] text-center pt-1">
              长按记录可快速删除
            </p>
          </div>
        )}
      </section>

      <AdBottom />
    </div>
  );
}

// ===== 子组件 =====
function StatCell({
  label,
  value,
  unit,
  color,
  empty,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  empty: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-2 rounded-2xl bg-[var(--bg-soft)]">
      <span
        className={cn(
          "text-2xl font-extrabold leading-none",
          empty ? "text-[var(--color-text-soft)]/50" : ""
        )}
        style={empty ? undefined : { color }}
      >
        {value}
      </span>
      <span className="text-[10px] text-[var(--color-text-soft)] mt-1">
        {unit}
      </span>
      <span className="text-[10px] text-[var(--color-text-soft)] mt-0.5">{label}</span>
    </div>
  );
}

function QuickAction({
  href,
  emoji,
  label,
  sub,
  gradient,
}: {
  href: string;
  emoji: string;
  label: string;
  sub: string;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 p-3 rounded-3xl text-white shadow-soft active:scale-95 transition-transform",
        gradient
      )}
    >
      <span className="text-3xl leading-none">{emoji}</span>
      <span className="text-sm font-bold mt-1">{label}</span>
      <span className="text-[10px] opacity-90 text-center leading-tight">{sub}</span>
    </Link>
  );
}
