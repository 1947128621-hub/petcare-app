"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Sparkles, Circle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { dailyTaskPool } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { TaskDefinition } from "@/lib/types";

// ===== 与 tasks/page.tsx 复用同款选任务逻辑 =====
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h | 0;
}

function pickDailyTasks(date: string, pool: TaskDefinition[], n: number): TaskDefinition[] {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) & 0xffffffff;
  }
  return [...pool]
    .sort((a, b) => {
      const ha = (h + hashCode(a.id)) & 0xffffffff;
      const hb = (h + hashCode(b.id)) & 0xffffffff;
      return ha - hb;
    })
    .slice(0, n);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function ProgressRing({
  percent,
  size = 36,
  stroke = 4,
}: {
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, percent)));
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--color-border)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-[var(--color-primary)]">
          {Math.round(percent * 100)}%
        </span>
      </div>
    </div>
  );
}

export default function TodayTasksWidget({ limit = 3 }: { limit?: number }) {
  const taskCompletions = useAppStore((s) => s.taskCompletions);

  const today = todayStr();
  const todaysTasks = useMemo(() => pickDailyTasks(today, dailyTaskPool, limit), [today, limit]);

  const completedSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of taskCompletions) {
      if (c.date === today) set.add(c.taskId);
    }
    return set;
  }, [taskCompletions, today]);

  const completedCount = todaysTasks.filter((t) => completedSet.has(t.id)).length;
  const total = todaysTasks.length;
  const percent = total === 0 ? 0 : completedCount / total;
  const allDone = total > 0 && completedCount === total;

  return (
    <Link
      href="/tasks"
      className="block bg-white rounded-2xl p-4 shadow-soft active:scale-[0.98] transition-transform"
    >
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-3">
        <ProgressRing percent={percent} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-bold text-[var(--color-text)]">今日任务</h3>
            {allDone && <Sparkles size={12} className="text-[var(--color-warning)]" />}
          </div>
          <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
            {allDone
              ? "🎉 今日已全部完成"
              : `已完成 ${completedCount} / ${total} · 继续加油`}
          </p>
        </div>
        <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
      </div>

      {/* 任务列表 */}
      <ul className="space-y-1.5">
        {todaysTasks.map((t) => {
          const done = completedSet.has(t.id);
          return (
            <li
              key={t.id}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl",
                done ? "bg-[var(--color-success)]/10" : "bg-[var(--bg-soft)]"
              )}
            >
              <span className="text-base flex-shrink-0">{t.emoji}</span>
              <span
                className={cn(
                  "flex-1 min-w-0 text-xs truncate",
                  done
                    ? "line-through text-[var(--color-text-soft)]"
                    : "text-[var(--color-text)]"
                )}
              >
                {t.title}
              </span>
              {done ? (
                <CheckCircle2 size={14} className="text-[var(--color-success)] flex-shrink-0" />
              ) : (
                <Circle size={14} className="text-[var(--color-text-soft)] flex-shrink-0" />
              )}
            </li>
          );
        })}
      </ul>

      {/* 底部 CTA */}
      <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <span className="text-[11px] text-[var(--color-text-soft)]">
          {allDone ? "明天继续 💪" : "每完成一个 +XP"}
        </span>
        <span className="text-[11px] text-[var(--color-primary)] font-semibold flex items-center gap-0.5">
          {allDone ? "查看记录" : "去完成任务"} <ChevronRight size={11} />
        </span>
      </div>
    </Link>
  );
}
