"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell, BellOff, Plus, Pill, Syringe, Scissors,
  Stethoscope, Clock, Repeat, MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom, AdSidebar } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { cn, speciesEmoji } from "@/lib/utils";
import type { Pet, Reminder, ReminderCategory } from "@/lib/types";

// ===== 类别元数据（颜色 / 图标 / 名称）=====
type CategoryMeta = {
  Icon: LucideIcon;
  bg: string;        // 大色块背景
  softBg: string;    // 浅色背景（标签/徽章）
  text: string;      // 文字色
  label: string;
};

const CATEGORY_META: Record<ReminderCategory, CategoryMeta> = {
  喂药: { Icon: Pill, bg: "bg-[#ff8c5a]", softBg: "bg-[#ff8c5a]/15", text: "text-[#ff8c5a]", label: "喂药" },
  驱虫: { Icon: Syringe, bg: "bg-[#8bc891]", softBg: "bg-[#8bc891]/15", text: "text-[#8bc891]", label: "驱虫" },
  疫苗: { Icon: Syringe, bg: "bg-[#5fa8d3]", softBg: "bg-[#5fa8d3]/15", text: "text-[#5fa8d3]", label: "疫苗" },
  洗澡: { Icon: Scissors, bg: "bg-[#f5a8b8]", softBg: "bg-[#f5a8b8]/15", text: "text-[#f5a8b8]", label: "洗澡" },
  美容: { Icon: Scissors, bg: "bg-[#c490e4]", softBg: "bg-[#c490e4]/15", text: "text-[#c490e4]", label: "美容" },
  复诊: { Icon: Stethoscope, bg: "bg-[#e07a6e]", softBg: "bg-[#e07a6e]/15", text: "text-[#e07a6e]", label: "复诊" },
  其他: { Icon: MoreHorizontal, bg: "bg-[#8a7a73]", softBg: "bg-[#8a7a73]/15", text: "text-[#8a7a73]", label: "其他" },
};

const REPEAT_LABEL: Record<Reminder["repeat"], string> = {
  once: "一次性",
  daily: "每天",
  weekly: "每周",
  monthly: "每月",
  quarterly: "每季",
  yearly: "每年",
};

const CATEGORY_ORDER: ReminderCategory[] = ["喂药", "驱虫", "疫苗", "洗澡", "美容", "复诊", "其他"];

type TabKey = "today" | "upcoming" | "overdue";

const TAB_META: Record<TabKey, { label: string; sub: string }> = {
  today: { label: "今日", sub: "24h 内" },
  upcoming: { label: "即将", sub: "7 天内" },
  overdue: { label: "已过期", sub: "未处理" },
};

// ===== 时间工具 =====
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * 友好倒计时：
 *  - 已过期 → "X 天前"
 *  - 不足 1 小时 → "X 分钟后" / "刚刚"
 *  - 不足 24 小时 → "X 小时后" / "今天 HH:mm"
 *  - 明天 → "明天上午/下午 HH:mm"
 *  - 几天内 → "X 天后"
 *  - 之后 → "X 月 X 日"
 */
function describeCountdown(targetIso: string, now: Date): { text: string; absolute: string } {
  const target = new Date(targetIso);
  const diffMs = target.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const sign = diffMs >= 0 ? 1 : -1;
  const min = Math.round(absMs / 60000);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  const timeOfDay = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  let text: string;
  if (sign < 0) {
    if (min < 60) return { text: `${min} 分钟前`, absolute: timeOfDay(target) };
    if (hour < 24) return { text: `${hour} 小时前`, absolute: timeOfDay(target) };
    return { text: `${day} 天前`, absolute: `${target.getMonth() + 1}/${target.getDate()}` };
  }

  if (min < 1) text = "即将";
  else if (min < 60) text = `${min} 分钟后`;
  else if (hour < 24) text = `${hour} 小时后`;
  else if (day === 1) {
    text = target.getHours() < 12 ? "明天上午" : target.getHours() < 18 ? "明天下午" : "明天晚上";
  } else if (day < 7) text = `${day} 天后`;
  else text = `${target.getMonth() + 1} 月 ${target.getDate()} 日`;

  return { text, absolute: timeOfDay(target) };
}

// ===== 单条提醒卡片 =====
function ReminderCard({
  reminder, pet, onToggle, now,
}: {
  reminder: Reminder;
  pet: Pet | undefined;
  onToggle: () => void;
  now: Date;
}) {
  const meta = CATEGORY_META[reminder.category];
  const Icon = meta.Icon;
  const countdown = useMemo(() => describeCountdown(reminder.nextAt, now), [reminder.nextAt, now]);
  const targetDate = new Date(reminder.nextAt);
  const isOverdue = targetDate.getTime() < now.getTime() && reminder.active;
  const isSoon = !isOverdue && targetDate.getTime() - now.getTime() < 24 * 3600 * 1000;

  return (
    <Link
      href={`/reminders/${reminder.id}`}
      className={cn(
        "flex items-stretch gap-3 bg-white rounded-2xl p-3 shadow-soft active:scale-[0.99] transition-transform",
        !reminder.active && "opacity-60"
      )}
    >
      {/* 左侧大色块 */}
      <div className={cn("w-14 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0", meta.bg)}>
        <Icon size={22} strokeWidth={2.2} />
        <span className="text-[9px] mt-0.5 font-medium opacity-90">{meta.label}</span>
      </div>

      {/* 主体 */}
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">{reminder.title}</h4>
        </div>
        {reminder.description && (
          <p className="text-xs text-[var(--color-text-soft)] line-clamp-1">{reminder.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[10px] text-[var(--color-text-soft)] flex items-center gap-0.5">
            {pet ? `${pet.avatar || speciesEmoji(pet.species)} ${pet.name}` : "未关联宠物"}
          </span>
          <span className="text-[10px] text-[var(--color-text-soft)]">·</span>
          <span className="text-[10px] text-[var(--color-text-soft)] flex items-center gap-0.5">
            <Repeat size={9} /> {REPEAT_LABEL[reminder.repeat]}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock size={11} className={cn(
              isOverdue ? "text-[var(--color-danger)]" : isSoon ? "text-[var(--color-warning)]" : "text-[var(--color-text-soft)]"
            )} />
            <span className={cn(
              "text-[11px] font-semibold",
              isOverdue ? "text-[var(--color-danger)]" : isSoon ? "text-[var(--color-warning)]" : "text-[var(--color-text)]"
            )}>
              {countdown.text}
            </span>
            <span className="text-[10px] text-[var(--color-text-soft)]">
              · {countdown.absolute}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 状态徽章 */}
            {isOverdue && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] font-medium">
                已过期
              </span>
            )}
            {!isOverdue && isSoon && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)] font-medium">
                即将
              </span>
            )}
            {!isOverdue && !isSoon && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] font-medium">
                正常
              </span>
            )}
            {/* 启停开关 */}
            <button
              type="button"
              aria-label={reminder.active ? "关闭提醒" : "开启提醒"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
              }}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full",
                reminder.active
                  ? "bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
                  : "bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
              )}
            >
              {reminder.active ? <Bell size={13} /> : <BellOff size={13} />}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ===== Tab 切换 =====
function TabBar({ active, onChange, counts }: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  counts: Record<TabKey, number>;
}) {
  return (
    <div className="flex items-center gap-2 mt-2 mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
      {(Object.keys(TAB_META) as TabKey[]).map((k) => {
        const isOn = k === active;
        const { label, sub } = TAB_META[k];
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0",
              isOn
                ? "bg-[var(--color-primary)] text-white shadow-soft"
                : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
            )}
          >
            <span>{label}</span>
            <span
              className={cn(
                "min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center",
                isOn ? "bg-white/25 text-white" : "bg-[var(--bg-soft)] text-[var(--color-text-soft)]"
              )}
            >
              {counts[k]}
            </span>
            <span className={cn("text-[10px]", isOn ? "opacity-85" : "text-[var(--color-text-soft)]")}>
              {sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ===== 空状态 =====
function EmptyState({ tab }: { tab: TabKey }) {
  const messages: Record<TabKey, { emoji: string; title: string; tip: string }> = {
    today: { emoji: "🌿", title: "今天很清闲", tip: "没有 24 小时内的提醒，好好陪毛孩子吧" },
    upcoming: { emoji: "📅", title: "近 7 天都安排好啦", tip: "看看其他时间，或者去添加新提醒" },
    overdue: { emoji: "✨", title: "没有积压的提醒", tip: "你是个负责任的小家长" },
  };
  const m = messages[tab];
  return (
    <div className="bg-white rounded-3xl p-8 text-center shadow-soft">
      <div className="text-5xl mb-3">{m.emoji}</div>
      <h3 className="text-sm font-bold text-[var(--color-text)]">{m.title}</h3>
      <p className="text-xs text-[var(--color-text-soft)] mt-1.5 leading-relaxed">{m.tip}</p>
    </div>
  );
}

// ===== 主页面 =====
export default function RemindersPage() {
  const reminders = useAppStore((s) => s.reminders);
  const pets = useAppStore((s) => s.pets);
  const toggleReminder = useAppStore((s) => s.toggleReminder);

  // 让倒计时每分钟重新计算（简单的 now tick）
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [tab, setTab] = useState<TabKey>("today");

  // 计算 3 个 tab 的桶
  const buckets = useMemo(() => {
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const todayArr: Reminder[] = [];
    const upcomingArr: Reminder[] = [];
    const overdueArr: Reminder[] = [];

    for (const r of reminders) {
      if (!r.active) continue; // 关闭的不计入"待办"
      const t = new Date(r.nextAt).getTime();
      if (t < dayStart.getTime()) {
        overdueArr.push(r);
      } else if (t <= dayEnd.getTime()) {
        todayArr.push(r);
      } else if (t <= sevenDaysLater.getTime()) {
        upcomingArr.push(r);
      }
    }
    // 排序：近的在前
    const asc = (a: Reminder, b: Reminder) =>
      new Date(a.nextAt).getTime() - new Date(b.nextAt).getTime();
    todayArr.sort(asc);
    upcomingArr.sort(asc);
    overdueArr.sort(asc);
    return { today: todayArr, upcoming: upcomingArr, overdue: overdueArr };
  }, [reminders, now]);

  const list = buckets[tab];
  const counts: Record<TabKey, number> = {
    today: buckets.today.length,
    upcoming: buckets.upcoming.length,
    overdue: buckets.overdue.length,
  };

  // 按 category 分组
  const grouped = useMemo(() => {
    const m = new Map<ReminderCategory, Reminder[]>();
    for (const r of list) {
      const arr = m.get(r.category) || [];
      arr.push(r);
      m.set(r.category, arr);
    }
    return CATEGORY_ORDER.filter((c) => (m.get(c)?.length || 0) > 0).map((c) => ({
      category: c,
      items: m.get(c)!,
    }));
  }, [list]);

  const petById = useMemo(() => {
    const map = new Map<string, Pet>();
    for (const p of pets) map.set(p.id, p);
    return map;
  }, [pets]);

  const handleToggle = (r: Reminder) => {
    toggleReminder(r.id);
    pushToast({
      kind: "info",
      title: r.active ? "已关闭" : "已开启",
      message: r.active ? `${r.title} 不再提醒` : `${r.title} 已恢复提醒`,
    });
  };

  return (
    <div className="pb-24">
      <PageHeader title="提醒中心" subtitle="不错过每一次健康节点" />

      <TabBar active={tab} onChange={setTab} counts={counts} />

      {reminders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center shadow-soft mt-6">
          <div className="text-6xl mb-3">🔔</div>
          <h3 className="text-base font-bold text-[var(--color-text)]">还没有提醒</h3>
          <p className="text-xs text-[var(--color-text-soft)] mt-1.5">
            驱虫、疫苗、洗澡… 一切重要的事都帮你记住
          </p>
          <Link
            href="/reminders/new"
            className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft active:scale-95 transition-transform"
          >
            <Plus size={14} />
            添加第一个
          </Link>
        </div>
      ) : list.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => {
            const meta = CATEGORY_META[g.category];
            const Icon = meta.Icon;
            return (
              <section key={g.category}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white", meta.bg)}>
                    <Icon size={12} strokeWidth={2.4} />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">
                    {meta.label}
                    <span className="ml-1.5 text-xs font-normal text-[var(--color-text-soft)]">
                      {g.items.length} 条
                    </span>
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {g.items.map((r) => (
                    <ReminderCard
                      key={r.id}
                      reminder={r}
                      pet={petById.get(r.petId)}
                      onToggle={() => handleToggle(r)}
                      now={now}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {/* 已关闭的提醒（不在主桶里，但需要给个交代） */}
          {reminders.some((r) => !r.active) && (
            <section className="opacity-70">
              <div className="flex items-center gap-2 mb-2 px-1">
                <BellOff size={12} className="text-[var(--color-text-soft)]" />
                <h3 className="text-xs font-medium text-[var(--color-text-soft)]">
                  已关闭
                  <span className="ml-1.5">{reminders.filter((r) => !r.active).length} 条</span>
                </h3>
              </div>
              <div className="space-y-2.5">
                {reminders.filter((r) => !r.active).map((r) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    pet={petById.get(r.petId)}
                    onToggle={() => handleToggle(r)}
                    now={now}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* 底部广告 */}
      <div className="mt-6 space-y-3">
        <AdBottom />
        <AdSidebar />
      </div>

      {/* FAB 新建 */}
      <Link
        href="/reminders/new"
        aria-label="新建提醒"
        className="fixed right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-card flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
