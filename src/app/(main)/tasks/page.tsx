"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Trophy, CheckCircle2, Sparkles, Flame, Star, Clock, Award,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { dailyTaskPool } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { TaskDefinition } from "@/lib/types";

// ===== 工具：基于日期 hash 选 N 个任务 =====
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

// ===== 进度环组件 =====
function ProgressRing({
  percent,
  size = 96,
  stroke = 8,
  centerLabel,
  centerValue,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  centerLabel?: string;
  centerValue?: string;
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerValue && <span className="text-xl font-bold text-[var(--color-text)]">{centerValue}</span>}
        {centerLabel && <span className="text-[10px] text-[var(--color-text-soft)] mt-0.5">{centerLabel}</span>}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  completed,
  onComplete,
}: {
  task: TaskDefinition;
  completed: boolean;
  onComplete: () => void;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-4 shadow-soft transition-all",
        completed && "bg-[var(--color-success)]/8"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0",
            completed ? "bg-[var(--color-success)]/20" : "bg-gradient-warm"
          )}
        >
          {task.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <h4
              className={cn(
                "text-sm font-bold text-[var(--color-text)]",
                completed && "line-through text-[var(--color-text-soft)]"
              )}
            >
              {task.title}
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)] font-medium inline-flex items-center gap-0.5">
              <Star size={9} className="fill-current" />
              +{task.xp} XP
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)]">
              {task.type}
            </span>
          </div>
          <p
            className={cn(
              "text-xs text-[var(--color-text-soft)]",
              completed && "line-through"
            )}
          >
            {task.description}
          </p>
          <div className="mt-2.5">
            {completed ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] text-xs font-semibold">
                <CheckCircle2 size={12} />
                已完成
              </span>
            ) : (
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold shadow-soft active:scale-95 transition-transform"
              >
                ✓ 完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const taskCompletions = useAppStore((s) => s.taskCompletions);
  const completeTask = useAppStore((s) => s.completeTask);
  const checkAndUnlockAchievements = useAppStore((s) => s.checkAndUnlockAchievements);

  // 当前日期（页面挂载时计算一次即可，避免跨日刷新）
  const [today] = useState<string>(todayStr());

  // mount 时触发一次成就检查
  useEffect(() => {
    checkAndUnlockAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 今日 3 个任务（按日期 hash 固定）
  const todaysTasks = useMemo(() => pickDailyTasks(today, dailyTaskPool, 3), [today]);

  // 今日已完成的任务 id
  const completedToday = useMemo(() => {
    const set = new Set<string>();
    for (const c of taskCompletions) {
      if (c.date === today) set.add(c.taskId);
    }
    return set;
  }, [taskCompletions, today]);

  const completedCount = todaysTasks.filter((t) => completedToday.has(t.id)).length;
  const allDone = completedCount === todaysTasks.length;

  // 今日已获得的 XP
  const todayXP = useMemo(() => {
    return todaysTasks
      .filter((t) => completedToday.has(t.id))
      .reduce((sum, t) => sum + t.xp, 0);
  }, [todaysTasks, completedToday]);

  // 累计 XP（全部任务完成历史）
  const totalXP = useMemo(() => {
    const xpById = new Map(dailyTaskPool.map((t) => [t.id, t.xp]));
    return taskCompletions.reduce((sum, c) => sum + (xpById.get(c.taskId) || 0), 0);
  }, [taskCompletions]);

  // 连续完成天数：以"完成至少 1 个任务"为日门槛，向前数连续天数
  const streakDays = useMemo(() => {
    const daySet = new Set(taskCompletions.map((c) => c.date));
    let count = 0;
    const start = new Date();
    // 起点是今天；如果今天没完成，则从昨天开始算（避免刚跨日时清零太突兀）
    if (!daySet.has(todayStr())) {
      start.setDate(start.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const d = new Date(start.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      if (daySet.has(key)) count++;
      else if (i > 0) break;
      else if (i === 0) break; // 起点日没完成 = 0
    }
    return count;
  }, [taskCompletions]);

  const handleComplete = (task: TaskDefinition) => {
    if (completedToday.has(task.id)) return;
    completeTask(task.id);
    pushToast({
      kind: "success",
      title: `+${task.xp} XP 🎉`,
      message: `${task.title} 已完成`,
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="每日任务"
        subtitle="完成小目标，养成好习惯"
      />

      {/* Hero 卡片 */}
      <div className="bg-white rounded-3xl p-5 shadow-card">
        <div className="flex items-center gap-4">
          <ProgressRing
            percent={completedCount / Math.max(1, todaysTasks.length)}
            size={96}
            stroke={8}
            centerValue={`${completedCount} / ${todaysTasks.length}`}
            centerLabel="今日"
          />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Trophy size={14} className="text-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-text-soft)]">今日 XP</span>
              <span className="text-sm font-bold text-[var(--color-text)] ml-auto">+{todayXP}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-[var(--color-warning)] fill-current" />
              <span className="text-xs text-[var(--color-text-soft)]">累计经验</span>
              <span className="text-sm font-bold text-[var(--color-text)] ml-auto">{totalXP} XP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame size={14} className="text-[var(--color-danger)]" />
              <span className="text-xs text-[var(--color-text-soft)]">连续天数</span>
              <span className="text-sm font-bold text-[var(--color-text)] ml-auto">{streakDays} 天</span>
            </div>
          </div>
        </div>

        {/* 全部完成彩蛋 */}
        {allDone && (
          <div className="mt-4 rounded-2xl bg-gradient-warm p-3 text-white flex items-center gap-2.5 animate-fade-up">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Award size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">🎉 今日任务全部完成！</p>
              <p className="text-[11px] opacity-90 mt-0.5">明天还有 3 个新任务等你挑战</p>
            </div>
            <Sparkles size={18} className="opacity-80" />
          </div>
        )}
      </div>

      {/* 任务列表 */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-1.5">
            <Clock size={14} className="text-[var(--color-primary)]" />
            今日任务
          </h3>
          <span className="text-[11px] text-[var(--color-text-soft)]">{today}</span>
        </div>
        {todaysTasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            completed={completedToday.has(t.id)}
            onComplete={() => handleComplete(t)}
          />
        ))}
      </section>

      {/* 提示卡 */}
      {!allDone && (
        <div className="rounded-2xl bg-[var(--bg-soft)] p-3.5 text-xs text-[var(--color-text-soft)] flex items-start gap-2">
          <span className="text-base">⏰</span>
          <p className="flex-1">
            完成任务可获得 XP，XP 用于解锁更多成就徽章。每天 0 点刷新任务。
          </p>
        </div>
      )}

      <AdBottom />
    </div>
  );
}
