"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Beef, Drumstick, Star, MessageCircle, CheckCircle2, AlertTriangle,
  Shield, AlertCircle, Sparkles, Save, ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { AdBottom } from "@/components/AdSlot";
// v0.4.0 — 6 个合作位占位
import PartnerSlot from "@/components/PartnerSlot";
import { pushToast } from "@/components/Toast";
import { useAppStore } from "@/lib/store";
import { analyzeFood } from "@/lib/data";
import { cn, speciesEmoji, speciesLabel } from "@/lib/utils";
import type { FoodItem, Pet, PetSpecies } from "@/lib/types";

// 评分配色（圆环 + 文字）
function scoreColor(score: number): { stroke: string; text: string; bg: string; label: string } {
  if (score >= 90) return { stroke: "var(--color-success)", text: "text-[var(--color-success)]", bg: "bg-[var(--color-success)]/15", label: "非常适合" };
  if (score >= 70) return { stroke: "var(--color-primary)", text: "text-[var(--color-primary)]", bg: "bg-[var(--color-primary)]/15", label: "比较适合" };
  if (score >= 55) return { stroke: "var(--color-warning)", text: "text-[var(--color-warning)]", bg: "bg-[var(--color-warning)]/15", label: "一般" };
  return { stroke: "var(--color-danger)", text: "text-[var(--color-danger)]", bg: "bg-[var(--color-danger)]/15", label: "不推荐" };
}

// SVG 圆环
function ScoreRing({ score }: { score: number }) {
  const size = 140;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  const { stroke: color, text, label } = scoreColor(score);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--color-border)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", text)}>{score}</span>
          <span className="text-[10px] text-[var(--color-text-soft)] mt-0.5">/ 100</span>
        </div>
      </div>
      <span className={cn("mt-2 text-xs font-bold", text)}>{label}</span>
    </div>
  );
}

function FoodIcon({ species }: { species: PetSpecies[] }) {
  const allCats = species.every((s) => s === "cat");
  const allDogs = species.every((s) => s === "dog");
  if (allCats) return <Drumstick size={28} className="text-white" />;
  if (allDogs) return <Beef size={28} className="text-white" />;
  return <Beef size={28} className="text-white" />;
}

function MetricCard({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-3 text-center",
        highlight ? "bg-gradient-warm text-white shadow-soft" : "bg-[var(--bg-soft)]"
      )}
    >
      <p
        className={cn(
          "text-[10px] font-medium",
          highlight ? "text-white/90" : "text-[var(--color-text-soft)]"
        )}
      >
        {label}
      </p>
      <p className="mt-1 flex items-baseline justify-center gap-0.5">
        <span
          className={cn(
            "text-xl font-bold",
            highlight ? "text-white" : "text-[var(--color-text)]"
          )}
        >
          {value}
        </span>
        <span
          className={cn(
            "text-[10px]",
            highlight ? "text-white/90" : "text-[var(--color-text-soft)]"
          )}
        >
          {unit}
        </span>
      </p>
    </div>
  );
}

export default function ClientView({ id: initialId }: { id: string }) {
  const params = { id: initialId } as { id: string };
  const router = useRouter();

  const foods = useAppStore((s) => s.foods);
  const pets = useAppStore((s) => s.pets);
  const addFoodCheck = useAppStore((s) => s.addFoodCheck);

  const food = useMemo(
    () => foods.find((f) => f.id === params?.id),
    [foods, params?.id]
  );

  // 选中宠物：默认第一只，切换时 AI 判读自动重算
  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id || null);
  const selectedPet = useMemo<Pet | undefined>(
    () => pets.find((p) => p.id === selectedPetId) || pets[0],
    [pets, selectedPetId]
  );

  // AI 判读
  const analysis = useMemo(() => {
    if (!food || !selectedPet) return null;
    return analyzeFood({ food, pet: selectedPet });
  }, [food, selectedPet]);

  // 相似食物：同 forSpecies & 同 lifeStage，排除自己
  const similar = useMemo(() => {
    if (!food) return [];
    return foods
      .filter(
        (f) =>
          f.id !== food.id &&
          f.lifeStage === food.lifeStage &&
          f.forSpecies.some((s) => food.forSpecies.includes(s))
      )
      .slice(0, 3);
  }, [foods, food]);

  if (!food) {
    return (
      <div>
        <PageHeader title="食物详情" back />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Drumstick size={48} className="text-[var(--color-text-soft)] mb-3" />
          <h3 className="text-base font-bold text-[var(--color-text)] mb-1">食物不存在</h3>
          <p className="text-xs text-[var(--color-text-soft)] mb-5">该食物可能已下架</p>
          <Link
            href="/food"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow-soft"
          >
            返回食物库
          </Link>
        </div>
      </div>
    );
  }

  // 保存到查询历史
  const handleSave = () => {
    if (!analysis || !selectedPet) return;
    addFoodCheck({
      petId: selectedPet.id,
      foodId: food.id,
      score: analysis.score,
      summary: analysis.summary,
      pros: analysis.pros,
      cons: analysis.cons,
    });
    pushToast({
      kind: "success",
      title: "已保存到查询历史",
      message: `适配分 ${analysis.score}`,
    });
  };

  // 咨询 AI 营养建议
  const handleConsult = () => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      "qa_prefill",
      `关于【${food.brand} · ${food.name}】，我的宠物是${selectedPet?.name || "?"}，${food.lifeStage}期，请问营养建议？`
    );
    router.push("/qa");
  };

  return (
    <div className="pb-24">
      <PageHeader
        title="食物详情"
        subtitle={food.brand}
        back
      />

      {/* 顶部选择宠物 */}
      {pets.length > 0 && (
        <div className="px-4 -mt-1 mb-3">
          <p className="text-[11px] font-semibold text-[var(--color-text-soft)] mb-1.5 px-1">
            适配判读对象（点击切换）
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {pets.map((p) => {
              const active = selectedPet?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPetId(p.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    active
                      ? "bg-[var(--color-primary)] text-white shadow-soft"
                      : "bg-white text-[var(--color-text)] border border-[var(--color-border)]"
                  )}
                >
                  <span>{p.avatar}</span>
                  {p.name}
                  <span className="text-[10px] opacity-80">
                    {speciesEmoji(p.species)} {p.age}岁
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero 卡片 */}
      <div className="bg-white rounded-3xl p-5 shadow-card mb-3">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-warm flex items-center justify-center flex-shrink-0">
            <FoodIcon species={food.forSpecies} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--color-text-soft)] font-medium mb-0.5">
              {food.brand}
            </p>
            <h1 className="text-lg font-bold text-[var(--color-text)] leading-snug mb-1.5">
              {food.name}
            </h1>
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {food.forSpecies.map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-soft)] text-[var(--color-text-soft)] font-medium"
                >
                  {speciesEmoji(s)} {speciesLabel(s)}
                </span>
              ))}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">
                {food.lifeStage}期
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Star size={14} className="text-[var(--color-warning)]" fill="currentColor" />
              <span className="text-sm font-bold text-[var(--color-text)]">
                {food.rating}
              </span>
              <span className="text-[10px] text-[var(--color-text-soft)]">综合评分</span>
            </div>
          </div>
        </div>
      </div>

      {/* 关键指标卡（4 列） */}
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 flex items-center gap-1.5">
          <Sparkles size={14} className="text-[var(--color-primary)]" />
          关键营养指标
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <MetricCard label="粗蛋白" value={food.crudeProtein} unit="%" highlight />
          <MetricCard label="粗脂肪" value={food.crudeFat} unit="%" />
          <MetricCard label="粗纤维" value={food.crudeFiber} unit="%" />
          <MetricCard label="水分" value={food.moisture} unit="%" />
        </div>
      </div>

      {/* 配料前 3 项 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-2.5">
          配料表（前 3 项）
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {food.topIngredients.map((ing, i) => (
            <span
              key={ing}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full font-medium",
                i === 0
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-primary-soft)]/30 text-[var(--color-primary)]"
              )}
            >
              {i + 1}. {ing}
            </span>
          ))}
        </div>
      </div>

      {/* 成分标签 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-2.5 flex items-center gap-1.5">
          <Shield size={14} className="text-[var(--color-primary)]" />
          成分标签
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-soft)]">谷物</span>
            {food.hasGrain ? (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)] font-medium">
                含谷物
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] font-medium">
                无谷 ✓
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-soft)]">人工添加剂</span>
            {food.hasArtificialAdditive ? (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)] font-medium">
                含添加剂
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] font-medium">
                无人工添加剂 ✓
              </span>
            )}
          </div>
          {food.hasAllergen.length > 0 && (
            <div className="flex items-start justify-between text-xs gap-2">
              <span className="text-[var(--color-text-soft)] flex-shrink-0">过敏原</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {food.hasAllergen.map((a) => (
                  <span
                    key={a}
                    className="px-2 py-0.5 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] font-medium"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 价格 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[var(--color-text-soft)]">参考价</p>
          <p className="text-2xl font-bold text-[var(--color-primary)] mt-0.5">
            ¥{food.pricePerKg}
            <span className="text-xs font-normal text-[var(--color-text-soft)]"> /kg</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[var(--color-text-soft)]">综合评分</p>
          <p className="flex items-center gap-0.5 justify-end text-2xl font-bold text-[var(--color-warning)] mt-0.5">
            <Star size={18} fill="currentColor" />
            {food.rating}
          </p>
        </div>
      </div>

      {/* AI 适配判读（核心区） */}
      {analysis && selectedPet && (
        <div className="rounded-3xl bg-gradient-to-br from-white to-[var(--bg-soft)] p-5 shadow-card mb-3">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-warm flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">
              AI 适配判读
            </h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">
              v0.1 mock
            </span>
          </div>

          {/* 圆环 + 总结 */}
          <div className="flex items-center gap-4 mb-4">
            <ScoreRing score={analysis.score} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[var(--color-text-soft)] font-medium">
                为 {selectedPet.avatar} {selectedPet.name} 评估
              </p>
              <p className="text-sm text-[var(--color-text)] leading-relaxed mt-1.5">
                {analysis.summary}
              </p>
            </div>
          </div>

          {/* 优点 / 缺点 */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {/* 优点 */}
            <div className="rounded-2xl bg-[var(--color-success)]/8 p-3">
              <p className="text-[11px] font-bold text-[var(--color-success)] mb-1.5 flex items-center gap-1">
                <CheckCircle2 size={12} /> 优点
              </p>
              {analysis.pros.length > 0 ? (
                <ul className="space-y-1">
                  {analysis.pros.map((p, i) => (
                    <li key={i} className="text-[11px] text-[var(--color-text)] leading-relaxed">
                      {p}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-[var(--color-text-soft)]">暂无明显优点</p>
              )}
            </div>

            {/* 缺点 */}
            <div className="rounded-2xl bg-[var(--color-danger)]/8 p-3">
              <p className="text-[11px] font-bold text-[var(--color-danger)] mb-1.5 flex items-center gap-1">
                <AlertCircle size={12} /> 注意事项
              </p>
              {analysis.cons.length > 0 ? (
                <ul className="space-y-1">
                  {analysis.cons.map((c, i) => (
                    <li key={i} className="text-[11px] text-[var(--color-text)] leading-relaxed">
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-[var(--color-text-soft)]">暂无明显问题</p>
              )}
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm shadow-soft active:scale-[0.98] transition-transform"
          >
            <Save size={14} />
            保存到查询历史
          </button>
        </div>
      )}

      {/* 适合 / 不适合场景 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-[var(--color-warning)]" />
          适用场景
        </h3>
        <div className="space-y-2.5">
          <div>
            <p className="text-[11px] text-[var(--color-success)] font-bold mb-1.5 flex items-center gap-1">
              ✓ 适合
            </p>
            <div className="flex flex-wrap gap-1.5">
              {food.suitableFor.map((s) => (
                <span
                  key={s}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-success)]/12 text-[var(--color-success)] font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] text-[var(--color-danger)] font-bold mb-1.5 flex items-center gap-1">
              ✗ 不适合
            </p>
            <div className="flex flex-wrap gap-1.5">
              {food.notSuitableFor.map((s) => (
                <span
                  key={s}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-danger)]/12 text-[var(--color-danger)] font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 相似食物推荐 */}
      {similar.length > 0 && (
        <section className="mt-5">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-1">
              🥣 相似食物推荐
            </h3>
            <Link
              href="/food"
              className="text-[11px] text-[var(--color-primary)] flex items-center gap-0.5"
            >
              更多 <ChevronRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {similar.map((f) => (
              <Link
                key={f.id}
                href={`/food/${f.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-soft active:scale-[0.98] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-warm flex items-center justify-center flex-shrink-0">
                  <FoodIcon species={f.forSpecies} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                    {f.name}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-soft)] mt-0.5">
                    {f.brand} · ¥{f.pricePerKg}/kg · ⭐{f.rating}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[var(--color-text-soft)] flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 底部广告 */}
      <div className="mt-5">
        <AdBottom />
      </div>

      {/* v0.4.0 — 合作位:买同款(食物成分结果页底部 card) */}
      <div className="mt-4">
        <PartnerSlot type="buy-same" />
      </div>

      {/* 底部固定按钮：咨询 AI */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] safe-area-bottom">
        <div className="max-w-[480px] mx-auto px-4 py-3">
          <button
            onClick={handleConsult}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm shadow-soft active:scale-[0.98] transition-transform"
          >
            <MessageCircle size={16} />
            咨询 AI 营养建议
          </button>
        </div>
      </div>
    </div>
  );
}
