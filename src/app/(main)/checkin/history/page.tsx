"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Footprints, Calendar, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { useAppStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import type { HealthCheck, HealthCheckType, WalkLog } from "@/lib/types";

// ===== 颜色样式 =====
const HEALTH_STYLE: Record<HealthCheckType, { emoji: string; color: string; soft: string }> = {
  便便: { emoji: "💩", color: "#8b6f47", soft: "bg-[#8b6f47]/15 text-[#6f5639]" },
  尿尿: { emoji: "💧", color: "#5b9bd5", soft: "bg-[#5b9bd5]/15 text-[#3d7bb0]" },
  呕吐: { emoji: "🤮", color: "#e3a93b", soft: "bg-[#e3a93b]/15 text-[#a87718]" },
  精神: { emoji: "😺", color: "#6b8afd", soft: "bg-[#6b8afd]/15 text-[#4a68d8]" },
  食欲: { emoji: "🍽️", color: "#ff8c5a", soft: "bg-[#ff8c5a]/15 text-[#d96a3a]" },
  饮水: { emoji: "💦", color: "#4ec5b8", soft: "bg-[#4ec5b8]/15 text-[#2f8a80]" },
};

const WALK_COLOR = "#8bc891";

type Tab = "all" | "health" | "walk";

type TimelineItem =
  | { kind: "health"; data: HealthCheck; ts: number }
  | { kind: "walk"; data: WalkLog; ts: number };

// ===== 日期分组 =====
type GroupKey = "今天" | "昨天" | "本周" | "本月" | "更早";

function groupOf(date: Date, now: Date): GroupKey {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDay = Math.floor((today.getTime() - target.getTime()) / 86400000);
  if (diffDay === 0) return "今天";
  if (diffDay === 1) return "昨天";

  // 本周 = 距今 2~6 天（自然周）
  if (diffDay < 7) return "本周";

  // 本月 = 同年同月
  if (target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth()) {
    return "本月";
  }
  return "更早";
}

const GROUP_ORDER: GroupKey[] = ["今天", "昨天", "本周", "本月", "更早"];

export default function HistoryPage() {
  const pets = useAppStore((s) => s.pets);
  const healthChecks = useAppStore((s) => s.healthChecks);
  const walkLogs = useAppStore((s) => s.walkLogs);

  const [tab, setTab] = useState<Tab>("all");

  const [selectedPetId, setSelectedPetId] = useState<string | "all">("all");

  // 过滤
  const filterByPet = <T extends { petId: string }>(arr: T[]) =>
    selectedPetId === "all" ? arr : arr.filter((x) => x.petId === selectedPetId);

  const fhc = useMemo(() => filterByPet(healthChecks), [healthChecks, selectedPetId]);
  const fwl = useMemo(() => filterByPet(walkLogs), [walkLogs, selectedPetId]);

  // ===== 今日 / 本周 / 本月 计数 =====
  const now = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  // 本周（过去 7 天含今天）
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 6);
    return d;
  }, []);
  // 本月开始
  const monthStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
  }, []);

  const inRange = (iso: string, start: Date) => new Date(iso) >= start;

  const countItems = (tab: Tab) => {
    const h = fhc.filter((x) => inRange(x.createdAt, todayStart));
    const w = fwl.filter((x) => inRange(x.createdAt, todayStart));
    if (tab === "all") return h.length + w.length;
    if (tab === "health") return h.length;
    return w.length;
  };
  const countWeek = (tab: Tab) => {
    const h = fhc.filter((x) => inRange(x.createdAt, weekStart));
    const w = fwl.filter((x) => inRange(x.createdAt, weekStart));
    if (tab === "all") return h.length + w.length;
    if (tab === "health") return h.length;
    return w.length;
  };
  const countMonth = (tab: Tab) => {
    const h = fhc.filter((x) => inRange(x.createdAt, monthStart));
    const w = fwl.filter((x) => inRange(x.createdAt, monthStart));
    if (tab === "all") return h.length + w.length;
    if (tab === "health") return h.length;
    return w.length;
  };

  // ===== 周图表数据：过去 7 天每天的条数 =====
  const weekBuckets = useMemo(() => {
    const days: Array<{ key: string; label: string; count: number; date: Date }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const label = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
      days.push({ key, label, count: 0, date: d });
    }

    const bump = (iso: string) => {
      const d = new Date(iso);
      d.setHours(0, 0, 0, 0);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const target = days.find((x) => x.key === k);
      if (target) target.count += 1;
    };

    if (tab === "all" || tab === "health") {
      fhc.forEach((x) => {
        if (new Date(x.createdAt) >= weekStart) bump(x.createdAt);
      });
    }
    if (tab === "all" || tab === "walk") {
      fwl.forEach((x) => {
        if (new Date(x.createdAt) >= weekStart) bump(x.createdAt);
      });
    }
    return days;
  }, [tab, fhc, fwl, weekStart]);

  // ===== 分组列表 =====
  const grouped = useMemo(() => {
    const items: TimelineItem[] = [];
    if (tab === "all" || tab === "health") {
      fhc.forEach((h) =>
        items.push({ kind: "health", data: h, ts: new Date(h.createdAt).getTime() })
      );
    }
    if (tab === "all" || tab === "walk") {
      fwl.forEach((w) =>
        items.push({ kind: "walk", data: w, ts: new Date(w.createdAt).getTime() })
      );
    }
    items.sort((a, b) => b.ts - a.ts);

    const groups: Record<GroupKey, TimelineItem[]> = {
      今天: [],
      昨天: [],
      本周: [],
      本月: [],
      更早: [],
    };
    items.forEach((it) => {
      const g = groupOf(new Date(it.ts), now);
      groups[g].push(it);
    });
    return groups;
  }, [tab, fhc, fwl, now]);

  const hasAny = fhc.length > 0 || fwl.length > 0;

  return (
    <div className="space-y-4">
      {/* 自定义返回按钮 */}
      <Link
        href="/checkin"
        aria-label="返回"
        className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
      >
        <ChevronLeft size={20} />
      </Link>

      <PageHeader title="打卡历史" back />

      {/* 宠物选择 */}
      {pets.length > 0 && (
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
      )}

      {/* Tab 切换 */}
      <div className="flex gap-2">
        {([
          { key: "all", label: "全部" },
          { key: "health", label: "健康" },
          { key: "walk", label: "遛狗" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-all",
              tab === t.key
                ? "bg-[var(--color-primary)] text-white shadow-soft"
                : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 统计三联卡 */}
      <section className="grid grid-cols-3 gap-2">
        <StatBlock label="今日" value={countItems(tab)} unit="条" />
        <StatBlock label="本周" value={countWeek(tab)} unit="条" />
        <StatBlock label="本月" value={countMonth(tab)} unit="条" />
      </section>

      {/* 周图表 */}
      <section className="bg-white rounded-3xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-[var(--color-primary)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)]">过去 7 天</h3>
        </div>
        <WeekChart buckets={weekBuckets} />
      </section>

      {/* 列表 */}
      {!hasAny ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl shadow-soft">
          <Calendar size={36} className="text-[var(--color-text-soft)] mb-2" />
          <p className="text-sm text-[var(--color-text)] font-semibold">还没有打卡记录</p>
          <p className="text-xs text-[var(--color-text-soft)] mt-1">
            先去「健康打卡」或「遛狗打卡」开始记录吧
          </p>
          <Link
            href="/checkin/health"
            className="mt-4 px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold shadow-soft active:scale-95"
          >
            去打卡
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {GROUP_ORDER.map((g) => {
            const items = grouped[g];
            if (items.length === 0) return null;
            return (
              <section key={g}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-xs font-bold text-[var(--color-text-soft)]">{g}</span>
                  <span className="text-[10px] text-[var(--color-text-soft)]">
                    · {items.length} 条
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((it) => (
                    <HistoryCard key={`${it.kind}_${it.data.id}`} item={it} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <AdBottom />
    </div>
  );
}

// ===== 单条历史卡 =====
function HistoryCard({ item }: { item: TimelineItem }) {
  if (item.kind === "walk") {
    const w = item.data;
    return (
      <div className="bg-white rounded-2xl p-3.5 shadow-soft flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${WALK_COLOR}29` }}
        >
          <Footprints size={18} style={{ color: WALK_COLOR }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[var(--color-text)]">遛狗打卡</h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: WALK_COLOR }}>
              遛狗
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-soft)] mt-1">
            时长 {w.durationMin} 分钟
            {w.distanceKm ? ` · 距离 ${w.distanceKm} km` : ""}
          </p>
          {w.note && (
            <p className="text-xs text-[var(--color-text)] mt-1 bg-[var(--bg-soft)] px-2.5 py-1.5 rounded-xl">
              {w.note}
            </p>
          )}
          <p className="text-[10px] text-[var(--color-text-soft)] mt-1">
            {formatDate(w.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  const h = item.data;
  const s = HEALTH_STYLE[h.type];
  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-soft flex items-start gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg", s.soft)}>
        <span>{s.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-[var(--color-text)]">{h.type}打卡</h4>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
            style={{ backgroundColor: s.color }}
          >
            {h.type}
          </span>
        </div>
        {h.rating && (
          <p className="text-xs text-[var(--color-text-soft)] mt-1">
            评分 {"⭐".repeat(h.rating)}
            <span className="ml-1.5 text-[var(--color-text-soft)]/60">
              {h.rating}/5
            </span>
          </p>
        )}
        {h.note && (
          <p className="text-xs text-[var(--color-text)] mt-1 bg-[var(--bg-soft)] px-2.5 py-1.5 rounded-xl">
            {h.note}
          </p>
        )}
        <p className="text-[10px] text-[var(--color-text-soft)] mt-1">
          {formatDate(h.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ===== 统计块 =====
function StatBlock({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-soft flex flex-col items-center">
      <span className="text-2xl font-extrabold text-[var(--color-primary)] leading-none">
        {value}
      </span>
      <span className="text-[10px] text-[var(--color-text-soft)] mt-1">{unit}</span>
      <span className="text-[10px] text-[var(--color-text-soft)] mt-0.5">{label}</span>
    </div>
  );
}

// ===== 纯 SVG 周柱状图 =====
function WeekChart({ buckets }: { buckets: Array<{ key: string; label: string; count: number; date: Date }> }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const W = 320;
  const H = 120;
  const padding = { top: 12, bottom: 24, left: 8, right: 8 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;
  const barW = (chartW / buckets.length) * 0.55;
  const gap = (chartW / buckets.length) * 0.45;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="过去 7 天打卡柱状图">
        {/* 底部基线 */}
        <line
          x1={padding.left}
          y1={H - padding.bottom + 0.5}
          x2={W - padding.right}
          y2={H - padding.bottom + 0.5}
          stroke="#f0e3d6"
          strokeWidth="1"
        />

        {buckets.map((b, i) => {
          const ratio = b.count / max;
          const barH = Math.max(2, chartH * ratio);
          const x = padding.left + i * (barW + gap) + gap / 2;
          const y = H - padding.bottom - barH;
          const isToday = i === buckets.length - 1;
          return (
            <g key={b.key}>
              {/* 柱 */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="4"
                fill={isToday ? "#ff8c5a" : "#ffb38a"}
              />
              {/* 数值（仅 > 0 时）*/}
              {b.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#ff8c5a"
                >
                  {b.count}
                </text>
              )}
              {/* 周几标签 */}
              <text
                x={x + barW / 2}
                y={H - padding.bottom + 14}
                textAnchor="middle"
                fontSize="9"
                fill={isToday ? "#ff8c5a" : "#8a7a73"}
                fontWeight={isToday ? "700" : "400"}
              >
                {b.label}
              </text>
              {/* 月/日（仅 1 号或第一个） */}
              {(b.date.getDate() === 1 || i === 0) && (
                <text
                  x={x + barW / 2}
                  y={H - 2}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#b3a59d"
                >
                  {b.date.getMonth() + 1}/{b.date.getDate()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
