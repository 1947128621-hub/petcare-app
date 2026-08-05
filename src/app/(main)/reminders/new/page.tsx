"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Check, Pill, Syringe, Scissors, Stethoscope, MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { cn, speciesEmoji } from "@/lib/utils";
import type { Pet, Reminder, ReminderCategory } from "@/lib/types";

// ===== 类别元数据 =====
type CategoryMeta = {
  Icon: LucideIcon;
  bg: string;
  text: string;
  label: string;
};

const CATEGORY_META: Record<ReminderCategory, CategoryMeta> = {
  喂药: { Icon: Pill, bg: "bg-[#ff8c5a]", text: "text-[#ff8c5a]", label: "喂药" },
  驱虫: { Icon: Syringe, bg: "bg-[#8bc891]", text: "text-[#8bc891]", label: "驱虫" },
  疫苗: { Icon: Syringe, bg: "bg-[#5fa8d3]", text: "text-[#5fa8d3]", label: "疫苗" },
  洗澡: { Icon: Scissors, bg: "bg-[#f5a8b8]", text: "text-[#f5a8b8]", label: "洗澡" },
  美容: { Icon: Scissors, bg: "bg-[#c490e4]", text: "text-[#c490e4]", label: "美容" },
  复诊: { Icon: Stethoscope, bg: "bg-[#e07a6e]", text: "text-[#e07a6e]", label: "复诊" },
  其他: { Icon: MoreHorizontal, bg: "bg-[#8a7a73]", text: "text-[#8a7a73]", label: "其他" },
};

const CATEGORY_LIST: ReminderCategory[] = ["喂药", "驱虫", "疫苗", "洗澡", "美容", "复诊", "其他"];

type RepeatValue = Reminder["repeat"];

const REPEAT_OPTIONS: Array<{ value: RepeatValue; label: string }> = [
  { value: "once", label: "一次性" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
  { value: "quarterly", label: "每季" },
  { value: "yearly", label: "每年" },
];

const REMIND_BEFORE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 10, label: "提前 10 分钟" },
  { value: 30, label: "提前 30 分钟" },
  { value: 60, label: "提前 1 小时" },
  { value: 1440, label: "提前 1 天" },
  { value: 4320, label: "提前 3 天" },
];

/**
 * 把 ISO 时间填进 datetime-local 需要的格式（YYYY-MM-DDTHH:mm，本地时区）
 */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 默认时间：明天上午 9:00
 */
function defaultLocalInput(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  // datetime-local 字符串不携带时区，按本地时区解析后转 ISO
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export default function NewReminderPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8 text-center text-sm text-[var(--color-text-soft)]">加载中…</div>}>
      <NewReminderForm />
    </Suspense>
  );
}

function NewReminderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = !!editId;

  const pets = useAppStore((s) => s.pets);
  const allReminders = useAppStore((s) => s.reminders);
  const addReminder = useAppStore((s) => s.addReminder);
  const updateReminder = useAppStore((s) => s.updateReminder);

  const existing: Reminder | undefined = useMemo(
    () => (editId ? allReminders.find((r) => r.id === editId) : undefined),
    [editId, allReminders]
  );

  // ===== 表单状态 =====
  const [petId, setPetId] = useState<string>(() => pets[0]?.id || "");
  const [category, setCategory] = useState<ReminderCategory>("驱虫");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repeat, setRepeat] = useState<RepeatValue>("monthly");
  const [nextAtLocal, setNextAtLocal] = useState<string>(defaultLocalInput());
  const [remindBefore, setRemindBefore] = useState<number>(30);

  // 编辑模式：填充表单
  useEffect(() => {
    if (!existing) return;
    setPetId(existing.petId);
    setCategory(existing.category);
    setTitle(existing.title);
    setDescription(existing.description || "");
    setRepeat(existing.repeat);
    setNextAtLocal(isoToLocalInput(existing.nextAt));
    setRemindBefore(existing.remindBefore ?? 30);
  }, [existing]);

  // 没有宠物可用时直接提示
  if (pets.length === 0) {
    return (
      <div>
        <Link
          href="/reminders"
          aria-label="返回"
          className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
        >
          <ChevronLeft size={20} />
        </Link>
        <PageHeader title={isEdit ? "编辑提醒" : "新建提醒"} back={false} />
        <div className="mt-6 mx-4 bg-white rounded-3xl p-8 text-center shadow-soft">
          <div className="text-5xl mb-3">🐾</div>
          <h3 className="text-base font-bold text-[var(--color-text)]">还没有添加宠物</h3>
          <p className="text-xs text-[var(--color-text-soft)] mt-1.5">
            请先创建宠物档案，再设置专属提醒
          </p>
          <Link
            href="/pets/new"
            className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft active:scale-95 transition-transform"
          >
            去添加宠物
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      pushToast({ kind: "warning", title: "请填写标题", message: "标题是必填项" });
      return;
    }
    if (!petId) {
      pushToast({ kind: "warning", title: "请选择宠物" });
      return;
    }
    if (!nextAtLocal) {
      pushToast({ kind: "warning", title: "请选择提醒时间" });
      return;
    }
    const nextAtIso = localInputToIso(nextAtLocal);

    if (isEdit && existing) {
      updateReminder(existing.id, {
        petId,
        category,
        title: trimmedTitle,
        description: description.trim() || undefined,
        repeat,
        nextAt: nextAtIso,
        remindBefore,
      });
      pushToast({ kind: "success", title: "已更新", message: trimmedTitle });
      router.push("/reminders");
    } else {
      addReminder({
        petId,
        category,
        title: trimmedTitle,
        description: description.trim() || undefined,
        repeat,
        nextAt: nextAtIso,
        remindBefore,
        active: true,
      });
      pushToast({ kind: "success", title: "已创建", message: trimmedTitle });
      router.push("/reminders");
    }
  };

  return (
    <div className="relative pb-28">
      {/* 返回按钮 */}
      <Link
        href="/reminders"
        aria-label="返回"
        className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
      >
        <ChevronLeft size={20} />
      </Link>

      <PageHeader title={isEdit ? "编辑提醒" : "新建提醒"} subtitle={isEdit ? "调整一次，保持习惯" : "为毛孩子安排一个重要节点"} />

      <div className="mt-2 space-y-4">
        {/* 宠物选择 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">
            宠物 <span className="text-[var(--color-danger)]">*</span>
          </label>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
            {pets.map((p: Pet) => {
              const active = p.id === petId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPetId(p.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all active:scale-95",
                    active
                      ? "bg-[var(--color-primary)] text-white shadow-soft"
                      : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                  )}
                >
                  <span className="text-base">{p.avatar || speciesEmoji(p.species)}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 类别 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">类别</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORY_LIST.map((c) => {
              const meta = CATEGORY_META[c];
              const Icon = meta.Icon;
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 rounded-2xl transition-all active:scale-95",
                    active
                      ? cn(meta.bg, "text-white shadow-soft")
                      : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                  )}
                >
                  <Icon size={18} strokeWidth={2.2} />
                  <span className="text-[11px] font-medium">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 标题 + 描述 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
              标题 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={category === "驱虫" ? "例如：体外驱虫" : category === "疫苗" ? "例如：妙三多加强针" : "给这次提醒起个名字"}
              maxLength={30}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="备注药品、剂量、地点…"
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>
        </section>

        {/* 重复规则 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">重复规则</label>
          <div className="grid grid-cols-3 gap-2">
            {REPEAT_OPTIONS.map((opt) => {
              const active = opt.value === repeat;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRepeat(opt.value)}
                  className={cn(
                    "py-2.5 rounded-2xl text-sm font-medium transition-all active:scale-95",
                    active
                      ? "bg-[var(--color-primary)] text-white shadow-soft"
                      : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 下次时间 + 提前提醒 */}
        <section className="bg-white rounded-3xl p-5 shadow-soft space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">下次提醒时间</label>
            <input
              type="datetime-local"
              value={nextAtLocal}
              onChange={(e) => setNextAtLocal(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">提前提醒</label>
            <div className="relative">
              <select
                value={remindBefore}
                onChange={(e) => setRemindBefore(Number(e.target.value))}
                className="w-full appearance-none px-4 py-3 pr-10 rounded-2xl bg-[var(--bg-soft)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {REMIND_BEFORE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-soft)] text-xs">▾</span>
            </div>
          </div>
        </section>
      </div>

      {/* 底部保存按钮 */}
      <div className="fixed left-0 right-0 bottom-20 z-30 px-4">
        <div className="max-w-[480px] mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-full bg-[var(--color-primary)] text-white font-semibold shadow-card active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Check size={18} />
            {isEdit ? "保存修改" : "保存提醒"}
          </button>
        </div>
      </div>
    </div>
  );
}
