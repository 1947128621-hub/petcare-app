"use client";

import { useMemo } from "react";
import { Cake } from "lucide-react";
import type { Pet } from "@/lib/types";

/**
 * 计算宠物当前的年龄，返回「x 岁 y 个月」格式。
 *  - 满 12 个月进位到下一年
 *  - 没有 birthday 时回退到 pet.age（来自档案）
 *  - birthday 在未来（用户误填）时按 0 岁 0 月兜底
 */
function computeAge(birthday: string | undefined, fallback: number): {
  years: number;
  months: number;
  label: string;
} {
  if (!birthday) {
    const y = Math.max(0, Math.floor(fallback));
    return { years: y, months: 0, label: `${y} 岁` };
  }
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) {
    const y = Math.max(0, Math.floor(fallback));
    return { years: y, months: 0, label: `${y} 岁` };
  }
  const now = new Date();
  if (birth.getTime() > now.getTime()) {
    return { years: 0, months: 0, label: "未满月" };
  }
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  years = Math.max(0, years);
  months = Math.max(0, months);
  return {
    years,
    months,
    label: months > 0 ? `${years} 岁 ${months} 个月` : `${years} 岁`,
  };
}

/**
 * 计算距离下次生日的天数。
 *  - 今年的生日已过 → 明年
 *  - 还没到 → 今年
 *  - 跨年返回 0 也即今天（同年同日）
 *  - 没有 birthday 时返回 null
 */
function daysUntilNextBirthday(birthday: string | undefined): number | null {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (thisYear.getTime() < now.getTime() - 86400000) {
    thisYear.setFullYear(thisYear.getFullYear() + 1);
  }
  const diffMs = thisYear.getTime() - now.getTime();
  const days = Math.max(0, Math.ceil(diffMs / 86400000));
  return days;
}

export interface PetAgeCardProps {
  pet: Pet;
  compact?: boolean;
  className?: string;
}

export default function PetAgeCard({ pet, compact = false, className = "" }: PetAgeCardProps) {
  const age = useMemo(() => computeAge(pet.birthday, pet.age), [pet.birthday, pet.age]);
  const daysLeft = useMemo(() => daysUntilNextBirthday(pet.birthday), [pet.birthday]);

  return (
    <div
      className={
        "relative overflow-hidden rounded-3xl bg-gradient-warm text-white shadow-card " +
        (compact ? "p-4 " : "p-5 ") +
        className
      }
    >
      {/* 装饰大字 */}
      <div
        aria-hidden
        className="absolute -right-2 -top-2 text-[110px] opacity-10 select-none pointer-events-none"
      >
        {pet.avatar || "🎂"}
      </div>

      <div className="relative flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0 border border-white/30">
          {pet.avatar || "🐾"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] opacity-90">成长档案</p>
          <h3 className="font-bold text-lg leading-tight truncate">
            {pet.name} · {age.label}
          </h3>
        </div>
        {daysLeft !== null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-sm flex-shrink-0">
            <Cake size={14} />
            <span className="text-xs font-semibold whitespace-nowrap">
              {daysLeft === 0 ? "今天生日 🎉" : `还有 ${daysLeft} 天`}
            </span>
          </div>
        )}
      </div>

      {!compact && daysLeft !== null && (
        <p className="relative mt-2 text-xs opacity-90">
          {daysLeft === 0
            ? "🎂 祝毛孩子生日快乐！记得多拍几张照留念～"
            : `🎂 距离下次生日还有 ${daysLeft} 天，提前准备小惊喜吧`}
        </p>
      )}
    </div>
  );
}
