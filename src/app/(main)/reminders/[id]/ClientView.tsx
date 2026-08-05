"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, CheckCircle2, Trash2, Pencil, Bell, BellOff,
  Calendar, Repeat, Clock, Pill, Syringe, Scissors, Stethoscope, MoreHorizontal,
  PawPrint, History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { cn, formatDate, formatDateShort, speciesEmoji } from "@/lib/utils";
import type { Pet, Reminder, ReminderCategory } from "@/lib/types";

// ===== 类别元数据 =====
type CategoryMeta = {
  Icon: LucideIcon;
  bg: string;       // 大色块背景
  softBg: string;   // 浅色块背景
  text: string;     // 文字色
  label: string;
};

const CATEGORY_META: Record<ReminderCategory, CategoryMeta> = {
  喂药: { Icon: Pill, bg: "bg-[#ff8c5a]", softBg: "bg-[#ff8c5a]/12", text: "text-[#ff8c5a]", label: "喂药" },
  驱虫: { Icon: Syringe, bg: "bg-[#8bc891]", softBg: "bg-[#8bc891]/12", text: "text-[#8bc891]", label: "驱虫" },
  疫苗: { Icon: Syringe, bg: "bg-[#5fa8d3]", softBg: "bg-[#5fa8d3]/12", text: "text-[#5fa8d3]", label: "疫苗" },
  洗澡: { Icon: Scissors, bg: "bg-[#f5a8b8]", softBg: "bg-[#f5a8b8]/12", text: "text-[#f5a8b8]", label: "洗澡" },
  美容: { Icon: Scissors, bg: "bg-[#c490e4]", softBg: "bg-[#c490e4]/12", text: "text-[#c490e4]", label: "美容" },
  复诊: { Icon: Stethoscope, bg: "bg-[#e07a6e]", softBg: "bg-[#e07a6e]/12", text: "text-[#e07a6e]", label: "复诊" },
  其他: { Icon: MoreHorizontal, bg: "bg-[#8a7a73]", softBg: "bg-[#8a7a73]/12", text: "text-[#8a7a73]", label: "其他" },
};

const REPEAT_LABEL: Record<Reminder["repeat"], string> = {
  once: "一次性",
  daily: "每天",
  weekly: "每周",
  monthly: "每月",
  quarterly: "每季",
  yearly: "每年",
};

const REPEAT_DELTA_DAYS: Record<Reminder["repeat"], number> = {
  once: 0,
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function InfoRow({
  icon: Icon, label, children, accent = "primary",
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  accent?: "primary" | "neutral";
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
        accent === "neutral" ? "bg-[var(--bg-soft)]" : "bg-[var(--color-primary)]/12"
      )}>
        <Icon size={14} className={cn(accent === "neutral" ? "text-[var(--color-text-soft)]" : "text-[var(--color-primary)]")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[var(--color-text-soft)] font-medium">{label}</p>
        <div className="text-sm text-[var(--color-text)] mt-0.5 break-words">{children}</div>
      </div>
    </div>
  );
}

export default function ClientView({ id }: { id: string }) {
  const router = useRouter();

  const reminder = useAppStore((s) => s.reminders.find((r) => r.id === id));
  const pets = useAppStore((s) => s.pets);
  const updateReminder = useAppStore((s) => s.updateReminder);
  const toggleReminder = useAppStore((s) => s.toggleReminder);
  const deleteReminder = useAppStore((s) => s.deleteReminder);

  const pet: Pet | undefined = useMemo(
    () => (reminder ? pets.find((p) => p.id === reminder.petId) : undefined),
    [pets, reminder]
  );

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!reminder) {
    return (
      <div>
        <PageHeader title="提醒详情" back />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell size={48} className="text-[var(--color-text-soft)] mb-3" />
          <h3 className="text-base font-bold text-[var(--color-text)] mb-1">提醒不存在</h3>
          <p className="text-xs text-[var(--color-text-soft)] mb-5">可能已被删除</p>
          <Link
            href="/reminders"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft"
          >
            返回提醒中心
          </Link>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[reminder.category];
  const Icon = meta.Icon;
  const target = new Date(reminder.nextAt);
  const isOverdue = target.getTime() < Date.now();
  const remindBeforeLabel = reminder.remindBefore
    ? reminder.remindBefore >= 1440
      ? `提前 ${reminder.remindBefore / 1440} 天`
      : reminder.remindBefore >= 60
        ? `提前 ${reminder.remindBefore / 60} 小时`
        : `提前 ${reminder.remindBefore} 分钟`
    : "不提前";

  // ===== 操作 =====
  const handleMarkDone = () => {
    if (reminder.repeat === "once") {
      // 一次性提醒直接关闭
      updateReminder(reminder.id, {
        active: false,
        lastTriggeredAt: new Date().toISOString(),
      });
      pushToast({ kind: "success", title: "已完成", message: `${reminder.title} 已关闭` });
    } else {
      const days = REPEAT_DELTA_DAYS[reminder.repeat];
      const nextAt = addDays(reminder.nextAt, days);
      updateReminder(reminder.id, {
        nextAt,
        lastTriggeredAt: new Date().toISOString(),
      });
      pushToast({
        kind: "success",
        title: "已完成一次",
        message: `下次：${formatDateShort(nextAt)}`,
      });
    }
  };

  const handleToggle = () => {
    toggleReminder(reminder.id);
    pushToast({
      kind: "info",
      title: reminder.active ? "已关闭" : "已开启",
    });
  };

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      // 3 秒后自动收回
      setTimeout(() => setConfirmingDelete(false), 3000);
      return;
    }
    deleteReminder(reminder.id);
    pushToast({ kind: "info", title: "已删除", message: reminder.title });
    router.push("/reminders");
  };

  return (
    <div className="pb-32">
      {/* 返回按钮 */}
      <Link
        href="/reminders"
        aria-label="返回"
        className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
      >
        <ChevronLeft size={20} />
      </Link>

      <PageHeader
        title="提醒详情"
        subtitle={meta.label}
        back={false}
        right={
          <div className="flex items-center gap-1.5">
            <Link
              href={`/reminders/new?id=${reminder.id}`}
              aria-label="编辑"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text-soft)]"
            >
              <Pencil size={15} />
            </Link>
            <button
              type="button"
              onClick={handleToggle}
              aria-label={reminder.active ? "关闭提醒" : "开启提醒"}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-soft",
                reminder.active ? "text-[var(--color-primary)]" : "text-[var(--color-text-soft)]"
              )}
            >
              {reminder.active ? <Bell size={15} /> : <BellOff size={15} />}
            </button>
          </div>
        }
      />

      {/* Hero */}
      <div className={cn("mt-2 rounded-3xl text-white p-5 shadow-card relative overflow-hidden", meta.bg)}>
        <div className="absolute -right-3 -top-3 text-[120px] opacity-10 select-none pointer-events-none">
          {meta.label}
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/30">
            <Icon size={30} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{reminder.title}</h1>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-sm">
                {meta.label}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-sm">
                {REPEAT_LABEL[reminder.repeat]}
              </span>
              {!reminder.active && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm">
                  已关闭
                </span>
              )}
              {isOverdue && reminder.active && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 backdrop-blur-sm">
                  已过期
                </span>
              )}
            </div>
          </div>
        </div>
        {reminder.description && (
          <p className="relative mt-4 text-sm opacity-95 leading-relaxed border-t border-white/20 pt-3 whitespace-pre-wrap">
            {reminder.description}
          </p>
        )}
      </div>

      {/* 信息卡 */}
      <div className="mt-3 bg-white rounded-2xl p-4 shadow-soft space-y-3.5">
        <InfoRow icon={PawPrint} label="宠物">
          {pet ? (
            <Link
              href={`/pets/${pet.id}`}
              className="inline-flex items-center gap-1.5 text-[var(--color-primary)] font-semibold"
            >
              <span className="text-base">{pet.avatar || speciesEmoji(pet.species)}</span>
              <span>{pet.name}</span>
              <span className="text-[var(--color-text-soft)] text-xs font-normal">查看档案 →</span>
            </Link>
          ) : (
            <span className="text-[var(--color-text-soft)]">未关联</span>
          )}
        </InfoRow>

        <InfoRow icon={Calendar} label="下次提醒时间">
          <span className={cn(
            "font-semibold",
            isOverdue && reminder.active ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"
          )}>
            {formatDateShort(reminder.nextAt)}
          </span>
          <span className="text-[var(--color-text-soft)] text-xs ml-1.5">
            {target.toTimeString().slice(0, 5)}
          </span>
        </InfoRow>

        <InfoRow icon={Repeat} label="重复规则">{REPEAT_LABEL[reminder.repeat]}</InfoRow>

        <InfoRow icon={Clock} label="提前提醒">{remindBeforeLabel}</InfoRow>
      </div>

      {/* 历史触发记录 */}
      {reminder.lastTriggeredAt && (
        <div className="mt-3 bg-white rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-soft)] flex items-center justify-center">
              <History size={14} className="text-[var(--color-text-soft)]" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">最近触发</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-soft)]">
              <CheckCircle2 size={12} className="text-[var(--color-success)]" />
              <span>{formatDate(reminder.lastTriggeredAt)}</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-soft)] pl-5">
              完成于 {formatDateShort(reminder.lastTriggeredAt)} · 已自动推进到下次
            </p>
          </div>
        </div>
      )}

      {/* 操作按钮区 */}
      <div className="mt-4 space-y-2.5">
        <button
          type="button"
          onClick={handleMarkDone}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm shadow-soft active:scale-[0.98] transition-transform"
        >
          <CheckCircle2 size={16} />
          {reminder.repeat === "once" ? "标记为已完成（关闭）" : "标记为已完成（推进到下次）"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform",
            confirmingDelete
              ? "bg-[var(--color-danger)] text-white shadow-card"
              : "bg-white text-[var(--color-danger)] border border-[var(--color-danger)]/30"
          )}
        >
          <Trash2 size={15} />
          {confirmingDelete ? "再次点击确认删除" : "删除提醒"}
        </button>
      </div>

      {/* 底部广告 */}
      <div className="mt-5">
        <AdBottom />
      </div>
    </div>
  );
}
