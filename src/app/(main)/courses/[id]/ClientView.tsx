"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  BookOpen, CheckCircle2, Circle, Clock, Star, ChevronLeft, PawPrint,
  Lightbulb, Sparkles, Trophy,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
// v0.4.0 — 6 个合作位占位
import PartnerSlot from "@/components/PartnerSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { cn, speciesEmoji, speciesLabel } from "@/lib/utils";
import type { CourseCategory, CourseStep } from "@/lib/types";

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
          size={14}
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

function StepItem({
  index,
  step,
  completed,
  onToggle,
  isLast,
}: {
  index: number;
  step: CourseStep;
  completed: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const [tipsOpen, setTipsOpen] = useState(false);

  return (
    <li className="relative pl-12 pb-4 last:pb-0">
      {/* 时间线竖线 */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-[var(--color-border)]" />
      )}

      {/* 步骤序号 + checkbox */}
      <div className="absolute left-0 top-2">
        <button
          onClick={onToggle}
          aria-label={completed ? "标记为未完成" : "标记为已完成"}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95",
            completed
              ? "bg-[var(--color-success)] text-white shadow-soft"
              : "bg-white border-2 border-[var(--color-border)] text-[var(--color-text-soft)] hover:border-[var(--color-primary)]"
          )}
        >
          {completed ? <CheckCircle2 size={20} /> : <span className="text-sm font-bold">{index + 1}</span>}
        </button>
      </div>

      <div
        className={cn(
          "bg-white rounded-2xl p-4 shadow-soft transition-all",
          completed && "bg-[var(--color-success)]/8"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                "text-sm font-bold text-[var(--color-text)]",
                completed && "line-through text-[var(--color-text-soft)]"
              )}
            >
              {step.title}
            </h4>
            <p
              className={cn(
                "text-xs text-[var(--color-text-soft)] mt-1 leading-relaxed",
                completed && "line-through"
              )}
            >
              {step.description}
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--color-text-soft)]">
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {step.durationMin} 分钟
              </span>
              {step.tips && step.tips.length > 0 && (
                <button
                  onClick={() => setTipsOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-[var(--color-primary)] font-medium"
                >
                  <Lightbulb size={11} />
                  {tipsOpen ? "收起" : "小贴士"} {step.tips.length}
                </button>
              )}
            </div>
            {/* tips 展开 */}
            {tipsOpen && step.tips && step.tips.length > 0 && (
              <ul className="mt-2.5 space-y-1.5 bg-[var(--bg-soft)] rounded-xl p-3">
                {step.tips.map((t, i) => (
                  <li key={i} className="text-[11px] text-[var(--color-text-soft)] flex items-start gap-1.5">
                    <span className="text-[var(--color-primary)] flex-shrink-0">💡</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={onToggle}
            aria-label={completed ? "撤销完成" : "完成步骤"}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95",
              completed
                ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                : "bg-[var(--bg-soft)] text-[var(--color-text-soft)] hover:bg-[var(--color-primary)]/15 hover:text-[var(--color-primary)]"
            )}
          >
            {completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </button>
        </div>
      </div>
    </li>
  );
}

export default function ClientView({ id: initialId }: { id: string }) {
  const params = { id: initialId } as { id: string };
  const router = useRouter();
  const courses = useAppStore((s) => s.courses);
  const pets = useAppStore((s) => s.pets);
  const courseProgress = useAppStore((s) => s.courseProgress);
  const completeCourseStep = useAppStore((s) => s.completeCourseStep);
  const checkAndUnlockAchievements = useAppStore((s) => s.checkAndUnlockAchievements);

  const course = useMemo(
    () => courses.find((c) => c.id === params?.id),
    [courses, params?.id]
  );

  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id || null);

  // 切换到对应宠物时，确保 selectedPetId 合法
  useEffect(() => {
    if (pets.length === 0) {
      setSelectedPetId(null);
      return;
    }
    if (!selectedPetId || !pets.some((p) => p.id === selectedPetId)) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  // 触发成就检查
  useEffect(() => {
    checkAndUnlockAchievements();
    // 仅 mount 一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useMemo(() => {
    if (!course || !selectedPetId) return null;
    return courseProgress.find(
      (p) => p.courseId === course.id && p.petId === selectedPetId
    );
  }, [course, courseProgress, selectedPetId]);

  const completedSet = useMemo(() => new Set(progress?.completedStepIds || []), [progress]);
  const completedCount = completedSet.size;
  const totalSteps = course?.steps.length || 0;
  const allDone = totalSteps > 0 && completedCount === totalSteps;
  const percent = totalSteps === 0 ? 0 : completedCount / totalSteps;

  const handleToggleStep = (stepId: string) => {
    if (!course || !selectedPetId) {
      pushToast({ kind: "warning", title: "请先选择宠物" });
      return;
    }
    const wasDone = completedSet.has(stepId);
    completeCourseStep(course.id, selectedPetId, stepId);
    if (!wasDone) {
      pushToast({
        kind: "success",
        title: "步骤完成 ✓",
        message: `已为当前宠物记录进度`,
      });
    }
  };

  if (!course) {
    return (
      <div>
        <PageHeader title="课程详情" back />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen size={48} className="text-[var(--color-text-soft)] mb-3" />
          <h3 className="text-base font-bold text-[var(--color-text)] mb-1">课程不存在</h3>
          <p className="text-xs text-[var(--color-text-soft)] mb-5">该课程可能已下架</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft"
          >
            返回课程库
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="课程详情" back />

      {/* 自定义返回按钮（PageHeader 的 back 占位未渲染） */}
      <button
        onClick={() => router.back()}
        aria-label="返回"
        className="fixed left-4 top-4 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-soft text-[var(--color-text)] active:scale-95"
      >
        <ChevronLeft size={20} />
      </button>

      {/* 🎉 全部完成彩带 */}
      {allDone && (
        <div className="bg-gradient-warm rounded-2xl p-4 text-white shadow-card flex items-center gap-3 animate-fade-up">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Trophy size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base">🎉 全部完成！</p>
            <p className="text-xs opacity-90 mt-0.5">你和毛孩子都是最棒的</p>
          </div>
          <Sparkles size={20} className="opacity-80" />
        </div>
      )}

      {/* Hero */}
      <div className="bg-white rounded-3xl p-5 shadow-card">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-warm flex items-center justify-center text-4xl flex-shrink-0">
            {course.coverEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--color-text)] leading-tight">
              {course.title}
            </h1>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", CATEGORY_COLOR[course.category])}>
                {course.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-soft)]">
                <DifficultyStars level={course.difficulty} />
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-soft)] mt-2 leading-relaxed">
              {course.summary}
            </p>
            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-[var(--color-text-soft)]">
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                建议 {course.durationDays} 天
              </span>
              <span className="inline-flex items-center gap-0.5">
                {course.forSpecies.map((s) => (
                  <span key={s} title={speciesLabel(s)}>{speciesEmoji(s)}</span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 宠物选择 + 进度条 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold text-[var(--color-text-soft)]">训练对象</h3>
          {pets.length > 0 ? (
            <span className="text-[11px] text-[var(--color-text-soft)]">
              已完成 {completedCount} / {totalSteps} 步
            </span>
          ) : null}
        </div>
        {pets.length > 0 ? (
          <>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
              {pets.map((p) => {
                const active = selectedPetId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPetId(p.id)}
                    className={cn(
                      "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      active
                        ? "bg-[var(--color-primary)] text-white shadow-soft"
                        : "bg-[var(--bg-soft)] text-[var(--color-text)]"
                    )}
                  >
                    <span className="mr-1">{p.avatar}</span>
                    {p.name}
                  </button>
                );
              })}
            </div>
            {/* 进度条 */}
            <div className="mt-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--color-text-soft)] mb-1">
                <span>训练进度</span>
                <span className="font-semibold text-[var(--color-primary)]">
                  {Math.round(percent * 100)}%
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-soft)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-warm rounded-full transition-[width] duration-500"
                  style={{ width: `${percent * 100}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <Link
            href="/pets/new"
            className="block p-3 rounded-xl bg-[var(--bg-soft)] text-center"
          >
            <PawPrint size={20} className="mx-auto text-[var(--color-text-soft)] mb-1" />
            <p className="text-xs text-[var(--color-text-soft)]">先添加宠物，再开始训练</p>
          </Link>
        )}
      </div>

      {/* 步骤时间线 */}
      <section className="bg-white rounded-2xl p-4 shadow-soft">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 flex items-center gap-1.5">
          <BookOpen size={14} className="text-[var(--color-primary)]" />
          训练步骤
        </h3>
        {selectedPetId ? (
          <ol>
            {course.steps.map((s, i) => (
              <StepItem
                key={s.id}
                index={i}
                step={s}
                completed={completedSet.has(s.id)}
                onToggle={() => handleToggleStep(s.id)}
                isLast={i === course.steps.length - 1}
              />
            ))}
          </ol>
        ) : (
          <p className="text-xs text-[var(--color-text-soft)] text-center py-4">
            请先选择宠物，才能记录步骤进度
          </p>
        )}
      </section>

      <AdBottom />

      {/* v0.4.0 — 合作位:线下训犬学校(课程页底部 banner) */}
      <PartnerSlot type="training-school" />
    </div>
  );
}
