"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Star, Clock, ChevronRight, PawPrint, Circle,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
import { useAppStore } from "@/lib/store";
import { cn, speciesEmoji, speciesLabel } from "@/lib/utils";
import type { Course, CourseCategory } from "@/lib/types";

type CategoryFilter = "全部" | CourseCategory;
const CATEGORIES: CategoryFilter[] = ["全部", "基础", "行为", "技能", "社交"];

const CATEGORY_COLOR: Record<CourseCategory, string> = {
  基础: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  行为: "bg-[var(--color-secondary)]/30 text-[var(--color-secondary)]",
  技能: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  社交: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
};

function DifficultyStars({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={cn(
            i <= level
              ? "fill-[var(--color-warning)] text-[var(--color-warning)]"
              : "text-[var(--color-border)]"
          )}
        />
      ))}
    </span>
  );
}

// 圆环进度组件
function ProgressRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, percent)));
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--color-border)"
          strokeWidth={4}
          fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--color-primary)"
          strokeWidth={4}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-[var(--color-primary)]">
          {Math.round(percent * 100)}%
        </span>
      </div>
    </div>
  );
}

function CourseCard({
  course,
  completedSteps,
  totalSteps,
}: {
  course: Course;
  completedSteps: number;
  totalSteps: number;
}) {
  const percent = totalSteps === 0 ? 0 : completedSteps / totalSteps;
  const done = totalSteps > 0 && completedSteps === totalSteps;
  return (
    <Link
      href={`/courses/${course.id}`}
      className="block bg-white rounded-2xl p-4 shadow-soft active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-warm flex items-center justify-center text-3xl flex-shrink-0">
          {course.coverEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <h3 className="text-base font-bold text-[var(--color-text)] truncate">
              {course.title}
            </h3>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", CATEGORY_COLOR[course.category])}>
              {course.category}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-soft)] line-clamp-1 mb-2">
            {course.summary}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-soft)]">
            <span className="inline-flex items-center gap-1">
              <DifficultyStars level={course.difficulty} />
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              {course.durationDays} 天
            </span>
            <span className="inline-flex items-center gap-0.5">
              <BookOpen size={11} />
              {totalSteps} 步
            </span>
            <span className="inline-flex items-center gap-0.5">
              {course.forSpecies.map((s) => (
                <span key={s} title={speciesLabel(s)}>{speciesEmoji(s)}</span>
              ))}
            </span>
          </div>
        </div>
        <ChevronRight size={18} className="text-[var(--color-text-soft)] flex-shrink-0 mt-1" />
      </div>

      {/* 进度条 + 圆环 */}
      <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center gap-3">
        <ProgressRing percent={percent} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-soft)] mb-1">
            <span>已完成 {completedSteps} / {totalSteps} 步</span>
            {done && <span className="text-[var(--color-success)] font-semibold">🎉 已通关</span>}
          </div>
          <div className="h-2 bg-[var(--bg-soft)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-warm rounded-full transition-[width] duration-500"
              style={{ width: `${percent * 100}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CoursesPage() {
  const courses = useAppStore((s) => s.courses);
  const courseProgress = useAppStore((s) => s.courseProgress);
  const pets = useAppStore((s) => s.pets);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id || null);
  const [category, setCategory] = useState<CategoryFilter>("全部");
  const [difficulty, setDifficulty] = useState<number | null>(null); // 1-5 或 null

  // 根据当前选中的宠物，统计每个课程的完成步骤数
  const completionByCourse = useMemo(() => {
    const map: Record<string, number> = {};
    if (!selectedPetId) return map;
    for (const p of courseProgress) {
      if (p.petId === selectedPetId) {
        map[p.courseId] = (map[p.courseId] || 0) + p.completedStepIds.length;
      }
    }
    return map;
  }, [courseProgress, selectedPetId]);

  // 综合过滤
  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (category !== "全部" && c.category !== category) return false;
      if (difficulty !== null && c.difficulty !== difficulty) return false;
      return true;
    });
  }, [courses, category, difficulty]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="训练课程"
        subtitle="每天 5 分钟，毛孩子更懂你"
      />

      {/* 宠物选择 chips */}
      {pets.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {pets.map((p) => {
            const active = selectedPetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPetId(p.id)}
                className={cn(
                  "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                  active
                    ? "bg-[var(--color-primary)] text-white shadow-soft"
                    : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
                )}
              >
                <span className="mr-1">{p.avatar}</span>
                {p.name}
              </button>
            );
          })}
        </div>
      ) : (
        <Link
          href="/pets/new"
          className="block p-5 rounded-2xl bg-white border border-dashed border-[var(--color-border)] text-center"
        >
          <PawPrint size={28} className="mx-auto text-[var(--color-text-soft)] mb-1.5" />
          <p className="text-sm text-[var(--color-text)] font-semibold">先添加一只宠物</p>
          <p className="text-xs text-[var(--color-text-soft)] mt-0.5">为它定制专属课程进度</p>
        </Link>
      )}

      {/* 分类 chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                active
                  ? "bg-[var(--color-primary)] text-white shadow-soft"
                  : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
              )}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* 难度筛选 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-soft)] flex-shrink-0">难度</span>
        <button
          onClick={() => setDifficulty(null)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
            difficulty === null
              ? "bg-[var(--color-text)] text-white"
              : "bg-white text-[var(--color-text-soft)] border border-[var(--color-border)]"
          )}
        >
          全部
        </button>
        {[1, 2, 3, 4, 5].map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d === difficulty ? null : d)}
            className={cn(
              "flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
              difficulty === d
                ? "bg-[var(--color-text)] text-white"
                : "bg-white text-[var(--color-text-soft)] border border-[var(--color-border)]"
            )}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={10}
                className={cn(
                  i <= d
                    ? difficulty === d
                      ? "fill-white text-white"
                      : "fill-[var(--color-warning)] text-[var(--color-warning)]"
                    : difficulty === d
                      ? "text-white/40"
                      : "text-[var(--color-border)]"
                )}
              />
            ))}
          </button>
        ))}
      </div>

      {/* 课程列表 */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            课程库
            <span className="ml-1.5 text-xs font-normal text-[var(--color-text-soft)]">
              ({filtered.length})
            </span>
          </h3>
          {(category !== "全部" || difficulty !== null) && (
            <button
              onClick={() => { setCategory("全部"); setDifficulty(null); }}
              className="text-[11px] text-[var(--color-primary)]"
            >
              清除筛选
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl shadow-soft">
            <Circle size={36} className="text-[var(--color-text-soft)] mb-2" />
            <p className="text-sm text-[var(--color-text)] font-semibold">没有匹配的课程</p>
            <p className="text-xs text-[var(--color-text-soft)] mt-1">试试其他分类或难度</p>
          </div>
        ) : (
          filtered.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              totalSteps={c.steps.length}
              completedSteps={completionByCourse[c.id] || 0}
            />
          ))
        )}
      </section>

      <AdBottom />
    </div>
  );
}
